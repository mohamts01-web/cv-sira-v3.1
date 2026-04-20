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
  service_type: string | null
  file_name: string | null
  created_at: string
}

async function getPresignedUrl(
  fileName: string,
  contentType: string,
  userId: string,
  tenantId: string
): Promise<{ uploadUrl: string; key: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const functionUrl = `${supabaseUrl}/functions/v1/generate-upload-url`

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
        body: JSON.stringify({ fileName, contentType, userId, tenantId }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  let { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error("User must be authenticated to upload files")
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
    throw new Error(`Edge Function returned ${response.status}: ${errorBody}`)
  }

  const urlData = await response.json()

  if (!urlData?.uploadUrl || !urlData?.key) {
    throw new Error("Invalid response from upload URL generator: " + JSON.stringify(urlData))
  }

  return { uploadUrl: urlData.uploadUrl, key: urlData.key }
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
    throw new Error(`Failed to upload to storage: ${text}`)
  }
}

async function saveMetadata(
  userId: string,
  tenantId: string,
  r2Key: string,
  serviceType?: string,
  fileName?: string
): Promise<{ id: string }> {
  const { data: fileRecord, error: dbError } = await supabase
    .from("files")
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      r2_key: r2Key,
      service_type: serviceType || null,
      file_name: fileName || null,
    })
    .select("id")
    .single()

  if (dbError) {
    throw new Error(`Failed to save file metadata: ${dbError.message}`)
  }

  return { id: fileRecord.id }
}

export async function uploadFile(
  file: File | Blob,
  userId: string,
  tenantId: string,
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

  const { uploadUrl, key } = await getPresignedUrl(fileName, contentType, userId, tenantId)

  options?.onProgress?.({ stage: "uploading", progress: 30 })

  await uploadToR2(uploadUrl, blob, contentType)

  options?.onProgress?.({ stage: "saving-metadata", progress: 80 })

  const { id } = await saveMetadata(userId, tenantId, key, options?.serviceType, fileName)

  options?.onProgress?.({ stage: "saving-metadata", progress: 100 })

  const accountId = "5d2aaa4d9c48ccc1ffc11fe92bb2d80f"
  const bucket = "qalva"

  return {
    key,
    id,
    url: `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`,
  }
}

export async function uploadCanvas(
  canvas: HTMLCanvasElement,
  userId: string,
  tenantId: string,
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

  return uploadFile(blob, userId, tenantId, {
    ...options,
    fileName,
    serviceType: options?.serviceType,
  })
}

export async function uploadDataUrl(
  dataUrl: string,
  userId: string,
  tenantId: string,
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

  return uploadFile(blob, userId, tenantId, {
    ...options,
    fileName,
    serviceType: options?.serviceType,
  })
}

export async function deleteFile(fileId: string): Promise<void> {
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
