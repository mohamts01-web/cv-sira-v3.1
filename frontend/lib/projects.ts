import { supabase } from "./supabase"
import { uploadDataUrl } from "./upload"

export type ServiceType =
  | "badge-generator"
  | "card-generator"
  | "svg-generator"
  | "mockup-generator"
  | "ascii-converter"
  | "infographic"
  | "infographic-editor"

export interface Project {
  id: string
  user_id: string
  tenant_id: string
  service_type: ServiceType
  title: string
  data: Record<string, unknown>
  thumbnail: string | null
  created_at: string
  updated_at: string
}

export async function saveProject(params: {
  serviceType: ServiceType
  title?: string
  data: Record<string, unknown>
  thumbnail?: string | null
  projectId?: string
}): Promise<Project> {
  console.log("[saveProject] Starting save for", params.serviceType)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.error("[saveProject] No session found")
    throw new Error("User must be authenticated")
  }

  const userId = session.user.id
  let tenantId = session.user.user_metadata?.tenant_id

  if (!tenantId) {
    console.warn("[saveProject] Tenant ID missing in user metadata, falling back to 'default'")
    tenantId = 'default'
  }

  console.log("[saveProject] Session found, userId:", userId, "tenantId:", tenantId)

  // If thumbnail is a data URL (base64 image from browser), upload it to R2
  let thumbnail = params.thumbnail
  if (thumbnail && thumbnail.startsWith("data:")) {
    console.log("[saveProject] Data URL detected, uploading to R2...")
    try {
      const uploadResult = await uploadDataUrl(thumbnail, userId, tenantId, params.projectId || "thumbnails", {
        serviceType: params.serviceType,
        fileName: `thumbnail-${Date.now()}.png`
      })
      console.log("[saveProject] R2 upload successful:", uploadResult.url)
      thumbnail = uploadResult.url
    } catch (error) {
      console.error("[saveProject] Failed to upload thumbnail to R2:", error)
      // Fallback to storing base64 if R2 fails
    }
  }

  // If projectId is provided, update existing project
  if (params.projectId) {
    return updateProject(params.projectId, {
      title: params.title,
      data: params.data,
      thumbnail: thumbnail,
    })
  }

  console.log("[saveProject] Inserting project into database...")
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      service_type: params.serviceType,
      title: params.title || getDefaultTitle(params.serviceType),
      data: params.data,
      thumbnail: thumbnail ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error("[saveProject] Database error:", error)
    throw new Error(`Failed to save project: ${error.message}`)
  }
  
  console.log("[saveProject] Project saved successfully:", data.id)
  return data as Project
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, "title" | "data" | "thumbnail">>
): Promise<Project> {
  // Check if thumbnail update is a data URL
  let thumbnail = updates.thumbnail
  if (thumbnail && thumbnail.startsWith("data:")) {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user.id
    let tenantId = session?.user.user_metadata?.tenant_id || 'default'
    
    if (userId) {
      try {
        const uploadResult = await uploadDataUrl(thumbnail, userId, tenantId, projectId, {
          fileName: `thumbnail-${Date.now()}.png`
        })
        thumbnail = uploadResult.url
      } catch (error) {
        console.error("Failed to upload thumbnail to R2 during update:", error)
      }
    }
  }

  // Convert undefined thumbnail to null for proper database handling
  const updateData = {
    ...updates,
    thumbnail: thumbnail ?? null,
  }

  const { data, error } = await supabase
    .from("projects")
    .update(updateData)
    .eq("id", projectId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update project: ${error.message}`)
  return data as Project
}

export async function getProjects(serviceType?: ServiceType): Promise<Project[]> {
  let query = supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false })

  if (serviceType) {
    query = query.eq("service_type", serviceType)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch projects: ${error.message}`)
  return data as Project[]
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)

  if (error) throw new Error(`Failed to delete project: ${error.message}`)
}

function getDefaultTitle(serviceType: ServiceType): string {
  const titles: Record<ServiceType, string> = {
    "badge-generator": "مشروع شارة",
    "card-generator": "مشروع بطاقة",
    "svg-generator": "مشروع SVG",
    "mockup-generator": "مشروع نموذج منتج",
    "ascii-converter": "مشروع ASCII Art",
    "infographic": "مشروع إنفوجرافيك",
    "infographic-editor": "مشروع محرر إنفوجرافيك",
  }
  return titles[serviceType] || "مشروع جديد"
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  "badge-generator": "مولّد الشارات",
  "card-generator": "مولّد البطاقات",
  "svg-generator": "مولّد SVG",
  "mockup-generator": "مولّد نماذج المنتجات",
  "ascii-converter": "محول ASCII Art",
  "infographic": "مولّد الإنفوجرافيك",
  "infographic-editor": "محرر الإنفوجرافيك",
}
