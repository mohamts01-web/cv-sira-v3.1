import { supabase } from "./supabase"

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
  thumbnail?: string
}): Promise<Project> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("User must be authenticated")

  let { data: { session: currentSession } } = await supabase.auth.getSession()
  if (!currentSession) throw new Error("User must be authenticated")

  const userId = currentSession.user.id
  const tenantId = currentSession.user.user_metadata?.tenant_id

  if (!tenantId) throw new Error("Tenant ID not found in user metadata")

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      service_type: params.serviceType,
      title: params.title || getDefaultTitle(params.serviceType),
      data: params.data,
      thumbnail: params.thumbnail || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save project: ${error.message}`)
  return data as Project
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, "title" | "data" | "thumbnail">>
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
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
