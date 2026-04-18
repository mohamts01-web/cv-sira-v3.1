"use client"
import { useEffect } from "react"

export function ServiceWorkerCleaner() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => {
          r.unregister()
          console.log("[CvSira] Unregistered old service worker")
        })
      })
      // Clear all caches
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name)
            console.log("[CvSira] Cleared cache:", name)
          })
        })
      }
    }
  }, [])
  return null
}
