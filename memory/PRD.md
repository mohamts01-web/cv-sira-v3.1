# CvSira - SaaS Platform

## Project Overview
**CvSira** - منصة السيرة الذاتية الذكية

## Routes
- `/`                                          → Landing page
- `/login`                                     → Login
- `/signup`                                    → Signup
- `/dashboard`                                 → User dashboard
- `/dashboard/services`                        → All services catalog
- `/dashboard/services/infographic`            → AI Image Generator (fal.ai mock)
- `/dashboard/services/infographic-editor`     → AI Infographic Editor (Fabric.js + Gemini) ✅
- `/admin`                                     → Admin panel

## Architecture
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS v4
- **Backend**: FastAPI (Python) + MongoDB (`cvsira_db`)
- **Auth**: JWT (httpOnly cookies, SameSite=none, Secure)

## Services
| Service | Cost | Status |
|---------|------|--------|
| AI Image Generator | 2 نقطة/صورة | Active (Mock) |
| AI Infographic Editor | 5 نقاط/توليد | Active (Gemini 2.5 Flash) |
| CV Generator | TBD | Coming Soon |
| Cover Letter | TBD | Coming Soon |

## Infographic Editor Stack
- `fabric` v6.6.1 - Canvas editing
- Gemini 2.5 Flash via emergentintegrations - AI generation
- Backend streams NDJSON, frontend renders elements progressively
- Features: Layers, Properties, Toolbar, Zoom, Export PNG/JSON, Undo/Redo

## What's Implemented
- [2026-04-18] Landing page + Next.js 15 setup
- [2026-04-18] KokonutUI Dashboard + CvSira branding
- [2026-04-18] Auth system (JWT, bcrypt, brute force)
- [2026-04-18] Login/Signup pages (Arabic RTL)
- [2026-04-18] Admin panel (users, plans, stats)
- [2026-04-18] AI Image Generator service (fal.ai mock)
- [2026-04-18] AI Infographic Editor (Fabric.js + Gemini 2.5 Flash)

## Backlog P0
- CV generation service
- Plan upgrade + Stripe payment
- fal.ai key activation

## Backlog P1
- User profile page
- Points history
- Google OAuth
