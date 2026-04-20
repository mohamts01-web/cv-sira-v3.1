import type React from "react"
import type { Metadata } from "next"
import { Manrope, Syne, Instrument_Sans, IBM_Plex_Sans_Arabic } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { ServiceWorkerCleaner } from "@/components/sw-cleaner"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-cal-sans",
  weight: ["700", "800"],
})

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  weight: ["400", "500", "600", "700"],
})

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  weight: ["300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "CvSira - منصة السيرة الذاتية الذكية",
  description: "أنشئ سيرتك الذاتية احترافياً بالذكاء الاصطناعي في ثوانٍ",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${manrope.variable} ${syne.variable} ${instrumentSans.variable} ${ibmPlexArabic.variable} font-sans antialiased`}>
        <ServiceWorkerCleaner />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
