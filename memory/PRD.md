# CvSira - SaaS Platform

## Project Overview
**CvSira** - منصة السيرة الذاتية الذكية - SaaS platform with AI-powered services, points-based system, user plans, and admin management.

## Routes
- `/`                                    → Landing page
- `/login`                               → Login (Arabic, purple design)
- `/signup`                              → Signup (Arabic, purple design)
- `/dashboard`                           → User dashboard (KokonutUI)
- `/dashboard/services`                  → All services catalog
- `/dashboard/services/infographic`      → AI Infographic Generator ✅ ACTIVE
- `/admin`                               → Admin panel (admin role only)

## Architecture
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB (`cvsira_db`)
- **Auth**: JWT (httpOnly cookies) + bcrypt

## Services System
| Service | Status | Points Cost | Model |
|---------|--------|-------------|-------|
| AI Infographic | Active (Mock mode) | 2 نقطة/صورة | ByteDance SeedDream v4.5 via fal.ai |
| CV Generator | Coming Soon | TBD | TBD |
| Cover Letter | Coming Soon | TBD | TBD |

**To activate real fal.ai generation:** Set `FAL_KEY=your-key` in `/app/backend/.env`

## Database Collections
- `users`: {name, email, password_hash, role, plan_name, plan_id, points, created_at}
- `plans`: {name, points, price, features, is_active, created_at}
- `login_attempts`: brute force tracking
- `service_usage`: {user_id, service, prompt, num_images, points_used, mock_mode, created_at}

## Default Plans (seeded on startup)
| Plan       | Points | Price  |
|------------|--------|--------|
| Free       | 5      | $0     |
| Pro        | 100    | $29/mo |
| Enterprise | 500    | $99/mo |

## What's Implemented
- [2026-04-18] Landing page + Next.js 15 setup
- [2026-04-18] KokonutUI Dashboard, CvSira branding
- [2026-04-18] Full Auth: register, login, logout, JWT, brute force protection
- [2026-04-18] Login/Signup pages: Arabic RTL, purple gradient
- [2026-04-18] Admin panel: user mgmt, plan mgmt, stats
- [2026-04-18] AI Infographic service: mock mode + fal.ai ready, points deduction, usage logging

## Backlog / P0
- CV generation service (main product)
- Services/Store page improvements
- Plan upgrade flow with payment (Stripe)
- FAL_KEY activation for real image generation

## P1
- User profile/settings page
- Points history / usage history page
- Google OAuth
- Email on registration

## P2
- Analytics in admin panel
- Notifications system
- Multi-language (Arabic/English)
