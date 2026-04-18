# CvSira - SaaS Platform

## Project Overview
**CvSira** - منصة السيرة الذاتية الذكية - SaaS platform with AI-powered CV generation, points-based service system, user plans, and admin management.

## Routes
- `/`          → Landing page (Apex-style dark SaaS landing)
- `/login`     → Login page (Arabic, purple design)
- `/signup`    → Signup page (Arabic, purple design)
- `/dashboard` → User dashboard (KokonutUI - protected)
- `/admin`     → Admin panel (admin role only)

## Architecture
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB (`cvsira_db`)
- **Auth**: JWT (httpOnly cookies) + bcrypt password hashing

## Tech Stack
- `next`: 15.x + App Router
- `framer-motion`: landing page animations
- `lenis`: smooth scrolling
- `tailwindcss`: v4 + tw-animate-css
- `next-themes`: dark/light mode
- `@radix-ui/*`: UI primitives (shadcn/ui)
- `PyJWT` + `bcrypt`: auth backend

## Database Collections
- `users`: {name, email, password_hash, role, plan_name, plan_id, points, created_at}
- `plans`: {name, points, price, features, is_active, created_at}
- `login_attempts`: brute force tracking {identifier, count, lockout_until}

## Default Plans (seeded on startup)
| Plan       | Points | Price  |
|------------|--------|--------|
| Free       | 5      | $0     |
| Pro        | 100    | $29/mo |
| Enterprise | 500    | $99/mo |

## What's Implemented
- [2026-04-18] Landing page: ZIP → Next.js 15 setup, Apex SaaS design
- [2026-04-18] Dashboard: KokonutUI financial dashboard at /dashboard, company name = CvSira
- [2026-04-18] Full Auth system: register, login, logout, me, refresh + brute force protection
- [2026-04-18] Login/Signup pages: Arabic RTL, purple gradient design
- [2026-04-18] Admin panel: user management, plan management, stats overview
- [2026-04-18] AuthContext: client-side auth state management
- [2026-04-18] Protected routes: /dashboard and /admin redirect if unauthenticated

## Backlog / P0
- AI-powered CV generation service (user's main product)
- Services/Store page with point consumption
- User profile/settings page
- Google OAuth (locked for now)
- Plan upgrade flow (Stripe payment)

## P1
- User can see their remaining points in dashboard
- Notifications system
- Email notifications on registration
- Password reset flow

## P2
- Analytics charts in admin panel
- Activity logs
- Multi-language support (Arabic/English)
