import type React from "react"
import type { Metadata } from "next"
import { Manrope, Syne, Instrument_Sans } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
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

export const metadata: Metadata = {
  title: "Apex - Enterprise SaaS Platform",
  description: "The modern platform for teams who ship fast. Built for scale, designed for speed.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${syne.variable} ${instrumentSans.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
