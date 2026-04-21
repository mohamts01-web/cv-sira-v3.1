"use client"

import { useState, useEffect } from "react"
import { Folder, FileCode, Trash2, ExternalLink, Clock, Sparkles } from "lucide-react"
import { getProjects, deleteProject, type Project, SERVICE_LABELS } from "@/lib/projects"
import { listFiles, deleteFile, type SavedFile } from "@/lib/upload"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [files, setFiles] = useState<SavedFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  async function loadData() {
    setLoading(true)
    try {
      const [projectsData, filesData] = await Promise.all([
        getProjects(),
        listFiles("default") // Using default tenant for now as per current logic
      ])
      setProjects(projectsData)
      setFiles(filesData)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
      toast.error("فشل تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteProject(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المشروع؟")) return
    try {
      await deleteProject(id)
      setProjects(projects.filter(p => p.id !== id))
      toast.success("تم حذف المشروع بنجاح")
    } catch (error) {
      toast.error("فشل حذف المشروع")
    }
  }

  async function handleDeleteFile(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الملف؟")) return
    try {
      await deleteFile(id)
      setFiles(files.filter(f => f.id !== id))
      toast.success("تم حذف الملف بنجاح")
    } catch (error) {
      toast.error("فشل حذف الملف")
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0F0F12] text-right" dir="rtl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Folder className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">مشاريعي وملفاتي</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mr-2">إدارة جميع أعمالك والمخرجات التي قمت بحفظها</p>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="mb-8 p-1 bg-gray-100 dark:bg-[#1F1F23] rounded-xl border border-gray-200 dark:border-[#2F2F33] inline-flex">
          <TabsTrigger value="projects" className="px-6 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-[#2F2F33] data-[state=active]:shadow-sm transition-all">
            المشاريع
          </TabsTrigger>
          <TabsTrigger value="files" className="px-6 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-[#2F2F33] data-[state=active]:shadow-sm transition-all">
            الملفات المرفوعة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-[#15151A] rounded-2xl border-2 border-dashed border-gray-200 dark:border-[#232328]">
              <div className="w-16 h-16 bg-gray-100 dark:bg-[#1F1F23] rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCode className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">لا توجد مشاريع حتى الآن</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">ابدأ بإنشاء أول عمل فني لك باستخدام خدماتنا الذكية</p>
              <Button asChild className="bg-purple-600 hover:bg-purple-700">
                <Link href="/dashboard/services">استكشف الخدمات</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <Card key={project.id} className="group overflow-hidden border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#15151A] hover:shadow-xl transition-all duration-300 rounded-2xl border-2 hover:border-purple-500/50">
                  <div className="aspect-video relative bg-gray-100 dark:bg-[#0F0F12] overflow-hidden">
                    {project.thumbnail ? (
                      <Image
                        src={project.thumbnail}
                        alt={project.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2 py-1 text-[10px] bg-black/60 backdrop-blur-md text-white rounded-full font-medium border border-white/20">
                        {SERVICE_LABELS[project.service_type] || project.service_type}
                      </span>
                    </div>
                  </div>
                  <CardHeader className="p-4 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {project.title}
                      </CardTitle>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3 ml-1" />
                        {new Date(project.updated_at).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardFooter className="p-4 pt-0">
                    <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 h-9 rounded-xl">
                      <Link href={`/dashboard/services/${project.service_type}?id=${project.id}`} className="flex items-center gap-2">
                        <span>متابعة العمل</span>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-[#15151A] rounded-2xl border-2 border-dashed border-gray-200 dark:border-[#232328]">
              <div className="w-16 h-16 bg-gray-100 dark:bg-[#1F1F23] rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">لا توجد ملفات مرفوعة</h3>
              <p className="text-gray-500 dark:text-gray-400">الملفات التي ترفعها مباشرة ستظهر هنا</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.map(file => (
                <Card key={file.id} className="overflow-hidden border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#15151A] rounded-xl hover:shadow-lg transition-all">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#0F0F12] flex items-center justify-center relative overflow-hidden">
                         {file.content_type?.startsWith('image/') ? (
                           <Image src={file.public_url!} alt={file.file_name!} fill className="object-cover" />
                         ) : (
                           <FileCode className="w-5 h-5 text-purple-500" />
                         )}
                      </div>
                      <div className="max-w-[150px]">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.file_name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {(Number(file.file_size || 0) / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <a href={file.public_url!} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFile(file.id)}
                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
