# Landing Page + Dashboard - Next.js

## Project Overview
**Apex** - Enterprise SaaS Platform with Landing Page and Financial Dashboard.
Built with Next.js 15 (App Router) + TypeScript + Tailwind CSS v4.

## Routes
- `/` → Landing Page (dark theme, Apex SaaS)
- `/dashboard` → KokonutUI Financial Dashboard (dark/light toggle)

## Architecture
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB

## Project Structure (Frontend `/app/frontend/`)
```
app/
├── layout.tsx          # Root layout (ThemeProvider, Google Fonts)
├── page.tsx            # Landing page (/)
├── globals.css         # Global styles + Tailwind v4
└── dashboard/
    └── page.tsx        # Dashboard page (/dashboard)

components/
├── navbar.tsx          # Landing page floating navbar
├── hero.tsx            # Hero section with animations
├── logo-marquee.tsx    # Scrolling logos
├── bento-grid.tsx      # Features bento grid
├── pricing.tsx         # Pricing cards
├── final-cta.tsx       # Final call to action
├── footer.tsx          # Footer
├── smooth-scroll.tsx   # Lenis smooth scroll
├── theme-provider.tsx  # next-themes provider
├── theme-toggle.tsx    # Dark/Light toggle button
├── kokonutui/
│   ├── dashboard.tsx   # Root dashboard component
│   ├── layout.tsx      # Dashboard layout (sidebar + topnav)
│   ├── sidebar.tsx     # Left sidebar navigation
│   ├── top-nav.tsx     # Top navigation bar
│   ├── content.tsx     # Main dashboard content
│   ├── list-01.tsx     # Accounts widget
│   ├── list-02.tsx     # Recent Transactions widget
│   ├── list-03.tsx     # Financial Goals widget
│   └── profile-01.tsx  # User profile dropdown
└── ui/                 # shadcn/ui components
```

## Key Dependencies
- `next`: 15.x
- `framer-motion`: ^11.0 (landing page animations)
- `lenis`: 1.3.17 (smooth scrolling)
- `tailwindcss`: v4 + tw-animate-css
- `next-themes`: dark/light mode
- `@radix-ui/*`: UI primitives

## What's Implemented
- [2026-04-18] Initial setup: Landing page from ZIP, Next.js 15 running on port 3000
- [2026-04-18] Dashboard: KokonutUI financial dashboard at /dashboard
  - Accounts panel with total balance
  - Recent Transactions panel
  - Financial Goals/Upcoming Events panel
  - Sidebar navigation with all sections
  - Top nav with theme toggle, notifications, user profile
  - Full dark/light mode support

## Env Variables
- `REACT_APP_BACKEND_URL`: Backend API URL

## Backlog / Future
- Add custom font files (CalSans, InstrumentSans) for exact design match
- Connect backend API (auth, real data)
- Add more dashboard pages (Analytics, Transactions detail, etc.)
- SEO optimization for landing page
