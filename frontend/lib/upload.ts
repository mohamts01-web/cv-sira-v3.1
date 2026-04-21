import { supabase } from "@/lib/supabase"

const MAX_FILE_SIZE = 50 * 1024 * 1024

export interface UploadResult {
  key: string
  id: string
  url: string
}

interface UploadProgress {
  stage: "generating-url" | "uploading" | "saving-metadata"
  progress: number
}

export interface SavedFile {
  id: string
  user_id: string
  tenant_id: string
  r2_key: string
  file_name: string | null
  file_size: number | null
  public_url: string | null
  content_type: string | null
  project_id: string | null
  service_type: string | null
  created_at: string
}

export interface R2ConnectionStatus {
  connected: boolean
  bucket?: string
  objectCount?: number
  latencyMs?: number
  publicUrl?: string
  error?: string
}

async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`

  const makeRequest = async (accessToken: string): Promise<Response> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      return await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  let { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error("User must be authenticated")
  }

  let response = await makeRequest(session.access_token)

  if (response.status === 401) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError || !refreshData.session) {
      throw new Error("Session expired. Please log in again.")
    }
    session = refreshData.session
    response = await makeRequest(session.access_token)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`[${functionName}] Edge Function error:`, response.status, errorBody)
    throw new Error(`Edge Function returned ${response.status}: ${errorBody}`)
  }

  return response.json()
}

async function getPresignedUrl(
  fileName: string,
  contentType: string,
  userId: string,
  projectId: string
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const data = await callEdgeFunction<{ uploadUrl: string; key: string; publicUrl: string }>(
    "generate-upload-url",
    { fileName, contentType, userId, projectId }
  )

  if (!data?.uploadUrl || !data?.key) {
    throw new Error("Invalid response from upload URL generator: " + JSON.stringify(data))
  }

  return data
}

async function uploadToR2(uploadUrl: string, body: Blob | File, contentType: string): Promise<void> {
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body,
    headers: {
      "Content-Type": contentType,
    },
  })

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text().catch(() => uploadResponse.statusText)
    console.error("[uploadToR2] R2 upload error:", uploadResponse.status, text)
    throw new Error(`Failed to upload to storage: ${text}`)
  }
}

async function saveMetadata(params: {
  userId: string
  tenantId: string
  r2Key: string
  fileName: string
  fileSize: number
  publicUrl: string
  contentType: string
  projectId: string
  serviceType?: string
}): Promise<{ id: string }> {
  const { data: fileRecord, error: dbError } = await supabase
    .from("files")
    .insert({
      user_id: params.userId,
      tenant_id: params.tenantId,
      r2_key: params.r2Key,
      file_name: params.fileName,
      file_size: params.fileSize,
      public_url: params.publicUrl,
      content_type: params.contentType,
      project_id: params.projectId,
      service_type: params.serviceType || null,
    })
    .select("id")
    .single()

  if (dbError) {
    throw new Error(`Failed to save file metadata: ${dbError.message}`)
  }

  return { id: fileRecord.id }
}

export async function checkR2Connection(): Promise<R2ConnectionStatus> {
  try {
    return await callEdgeFunction<R2ConnectionStatus>("check-r2-connection", {})
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : "Connection check failed",
    }
  }
}

export async function uploadFile(
  file: File | Blob,
  userId: string,
  tenantId: string,
  projectId: string,
  options?: {
    serviceType?: string
    fileName?: string
    onProgress?: (progress: UploadProgress) => void
  }
): Promise<UploadResult> {
  const blob = file instanceof Blob ? file : new Blob([file])
  const fileName = options?.fileName || (file instanceof File ? file.name : "file.png")
  const contentType = blob.type || "image/png"

  if (blob.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  options?.onProgress?.({ stage: "generating-url", progress: 0 })

  const { uploadUrl, key, publicUrl } = await getPresignedUrl(fileName, contentType, userId, projectId)

  options?.onProgress?.({ stage: "uploading", progress: 30 })

  await uploadToR2(uploadUrl, blob, contentType)

  options?.onProgress?.({ stage: "saving-metadata", progress: 80 })

  let savedId = ""

  try {
    const { id } = await saveMetadata({
      userId,
      tenantId,
      r2Key: key,
      fileName,
      fileSize: blob.size,
      publicUrl,
      contentType,
      projectId,
      serviceType: options?.serviceType,
    })
    savedId = id
  } catch (metadataError) {
    try {
      await callEdgeFunction("delete-r2-file", { key, userId })
    } catch (cleanupError) {
      console.error("[uploadFile] Failed to cleanup R2 object after metadata save failure:", cleanupError)
    }
    throw metadataError
  }

  options?.onProgress?.({ stage: "saving-metadata", progress: 100 })

  return {
    key,
    id: savedId,
    url: publicUrl,
  }
}

export async function uploadCanvas(
  canvas: HTMLCanvasElement,
  userId: string,
  tenantId: string,
  projectId: string,
  options?: {
    serviceType?: string
    fileName?: string
    format?: "png" | "jpeg" | "webp"
    quality?: number
    onProgress?: (progress: UploadProgress) => void
  }
): Promise<UploadResult> {
  const format = options?.format || "png"
  const mimeType = `image/${format}`
  const fileName = options?.fileName || `output-${Date.now()}.${format}`

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error("Failed to convert canvas to blob"))
      },
      mimeType,
      options?.quality
    )
  })

  return uploadFile(blob, userId, tenantId, projectId, {
    ...options,
    fileName,
    serviceType: options?.serviceType,
  })
}

export async function uploadDataUrl(
  dataUrl: string,
  userId: string,
  tenantId: string,
  projectId: string,
  options?: {
    serviceType?: string
    fileName?: string
    onProgress?: (progress: UploadProgress) => void
  }
): Promise<UploadResult> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const mimeType = blob.type || "image/png"
  const ext = mimeType.split("/")[1] || "png"
  const fileName = options?.fileName || `output-${Date.now()}.${ext}`

  return uploadFile(blob, userId, tenantId, projectId, {
    ...options,
    fileName,
    serviceType: options?.serviceType,
  })
}

export async function deleteFile(fileId: string): Promise<void> {
  const { data: fileRecord, error: fetchError } = await supabase
    .from("files")
    .select("r2_key, user_id")
    .eq("id", fileId)
    .single()

  if (fetchError || !fileRecord) {
    throw new Error(`Failed to fetch file record: ${fetchError?.message || "File not found"}`)
  }

  try {
    await callEdgeFunction("delete-r2-file", {
      key: fileRecord.r2_key,
      userId: fileRecord.user_id,
    })
  } catch (r2Error) {
    console.error("[deleteFile] Failed to delete from R2, proceeding with DB deletion:", r2Error)
  }

  const { error: deleteError } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId)

  if (deleteError) {
    throw new Error(`Failed to delete file metadata: ${deleteError.message}`)
  }
}

export async function listFiles(tenantId: string, serviceType?: string): Promise<SavedFile[]> {
  let query = supabase
    .from("files")
    .select("*")
    .eq("tenant_id", tenantId)

  if (serviceType) {
    query = query.eq("service_type", serviceType)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`)
  }

  return data as SavedFile[]
}

export async function getUserFiles(
  userId: string,
  tenantId: string,
  serviceType?: string
): Promise<SavedFile[]> {
  let query = supabase
    .from("files")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)

  if (serviceType) {
    query = query.eq("service_type", serviceType)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`)
  }

  return data as SavedFile[]
}

export async function getProjectFiles(
  userId: string,
  tenantId: string,
  projectId: string
): Promise<SavedFile[]> {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to list project files: ${error.message}`)
  }

  return data as SavedFile[]
}
