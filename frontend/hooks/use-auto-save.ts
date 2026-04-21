"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSaveProject } from "./use-save-project"
import type { ServiceType } from "@/lib/projects"
import { useToast } from "@/hooks/use-toast"

interface UseAutoSaveOptions {
    serviceType: ServiceType
    data: Record<string, unknown>
    thumbnail?: string | null
    enabled?: boolean
    delay?: number // Delay in milliseconds before auto-saving (default: 2000ms)
    onSaveComplete?: (project: any) => void
}

export function useAutoSave({
    serviceType,
    data,
    thumbnail,
    enabled = true,
    delay = 2000,
    onSaveComplete,
}: UseAutoSaveOptions) {
    const { save, isSaving, lastSaved } = useSaveProject(serviceType)
    const { toast } = useToast()
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const previousDataRef = useRef<Record<string, unknown>>({})
    const projectIdRef = useRef<string | null>(null)

    // Function to trigger auto-save with debounce
    const triggerAutoSave = useCallback(() => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        // Set new timeout for auto-save
        timeoutRef.current = setTimeout(async () => {
            if (!enabled) {
                console.log('[Auto-Save] Disabled, skipping save')
                return
            }

            try {
                // Check if data has actually changed
                const currentDataString = JSON.stringify(data)
                const previousDataString = JSON.stringify(previousDataRef.current)
                const dataChanged = currentDataString !== previousDataString

                console.log('[Auto-Save] Data changed:', dataChanged)
                console.log('[Auto-Save] Current data keys:', Object.keys(data))

                if (dataChanged) {
                    console.log('[Auto-Save] Triggering save...')
                    const project = await save({
                        title: `مسودة - ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`,
                        data,
                        thumbnail: thumbnail ?? null,
                        projectId: projectIdRef.current || undefined,
                    })

                    console.log('[Auto-Save] Save successful:', project)

                    // Show success toast
                    toast({
                        title: "تم الحفظ التلقائي",
                        description: "تم حفظ المشروع بنجاح",
                    })

                    // Update project ID for future updates
                    projectIdRef.current = project.id
                    previousDataRef.current = { ...data }

                    // Call completion callback
                    if (onSaveComplete) {
                        onSaveComplete(project)
                    }
                } else {
                    console.log('[Auto-Save] No changes detected, skipping save')
                }
            } catch (error) {
                const errMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
                console.error('[Auto-Save] Failed:', error)
                console.error('[Auto-Save] Error details:', {
                    message: errMessage,
                    stack: error instanceof Error ? error.stack : undefined,
                    errorType: typeof error,
                    dataKeys: Object.keys(data),
                    enabled,
                })

                toast({
                    title: "فشل الحفظ التلقائي",
                    description: errMessage,
                    variant: "destructive",
                })
            }
        }, delay)
    }, [serviceType, data, thumbnail, enabled, delay, save, onSaveComplete])

    // Trigger auto-save whenever data changes
    useEffect(() => {
        if (enabled) {
            triggerAutoSave()
        }

        // Cleanup timeout on unmount
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [data, enabled, triggerAutoSave])

    // Manual save function with custom title
    const manualSave = useCallback(async (title?: string) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        try {
            const project = await save({
                title: title || `مشروع - ${new Date().toLocaleDateString('ar-SA')}`,
                data,
                thumbnail: thumbnail ?? null,
                projectId: projectIdRef.current || undefined,
            })

            // Update project ID for future updates
            projectIdRef.current = project.id
            previousDataRef.current = { ...data }

            if (onSaveComplete) {
                onSaveComplete(project)
            }

            return project
        } catch (error) {
            const errMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
            console.error('Manual save failed:', error)

            toast({
                title: "فشل الحفظ",
                description: errMessage,
                variant: "destructive",
            })

            throw error
        }
    }, [data, thumbnail, save, onSaveComplete])

    // Reset project ID when data is significantly changed (optional)
    const resetProjectId = useCallback(() => {
        projectIdRef.current = null
    }, [])

    return {
        isSaving,
        lastSaved,
        manualSave,
        resetProjectId,
    }
}
