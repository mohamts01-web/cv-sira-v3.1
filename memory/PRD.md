# Landing Page Next.js

## Project Overview
Landing page for "Apex" - Enterprise SaaS Platform built with Next.js 15.

## Architecture
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB

## Project Structure (Frontend)
```
/app/frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (Google Fonts: Manrope, Syne, Instrument Sans)
│   ├── page.tsx            # Main page (imports all sections)
│   └── globals.css         # Global styles + Tailwind v4
├── components/             # Landing page sections
│   ├── navbar.tsx          # Floating navbar
│   ├── hero.tsx            # Hero section with text animations
│   ├── logo-marquee.tsx    # Scrolling logos
│   ├── bento-grid.tsx      # Features bento grid
│   ├── pricing.tsx         # Pricing cards
│   ├── final-cta.tsx       # Final call to action
│   ├── footer.tsx          # Footer
│   ├── smooth-scroll.tsx   # Lenis smooth scroll
│   └── ui/                 # shadcn/ui components
├── hooks/                  # React hooks
├── lib/                    # Utilities
└── public/                 # Static assets (headshots, icons)
```

## Key Dependencies
- `next`: 15.x
- `framer-motion`: ^11.0 (animations)
- `lenis`: 1.3.17 (smooth scrolling)
- `tailwindcss`: v4 (with tw-animate-css)
- `@radix-ui/*`: UI primitives

## What's Implemented
- [2026-04-18] Initial setup: Extracted ZIP, configured as Next.js project, running on port 3000
- Layout: Manrope (body), Syne (display/headings), Instrument Sans (sub-headings) - Google Fonts
- All landing page sections working: Navbar, Hero, LogoMarquee, BentoGrid, Pricing, FinalCTA, Footer

## Env Variables
- `REACT_APP_BACKEND_URL`: Backend API URL

## Backlog
- Add custom font files (CalSans, InstrumentSans) for exact design match
- Connect backend API if needed
- Add pages (docs, blog, pricing detail, etc.)
- SEO optimization
