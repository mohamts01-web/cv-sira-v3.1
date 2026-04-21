"use client"

import { useState, useCallback } from "react"
import { saveProject, type ServiceType, type Project } from "@/lib/projects"

export function useSaveProject(serviceType: ServiceType) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async (params: {
    title?: string
    data: Record<string, unknown>
    thumbnail?: string | null
    projectId?: string
  }) => {
    setIsSaving(true)
    setError(null)
    try {
      const project = await saveProject({
        serviceType,
        title: params.title,
        data: params.data,
        thumbnail: params.thumbnail,
        projectId: params.projectId,
      })
      setLastSaved(project)
      return project
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل حفظ المشروع"
      setError(msg)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [serviceType])

  return { save, isSaving, lastSaved, error }
}
