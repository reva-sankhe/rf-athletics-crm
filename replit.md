# RF Athletics - Athlete CRM

## Overview
A React + Vite single-page application for managing athletes and tracking their performance across events. Built with TypeScript, TailwindCSS v4, and Supabase as the backend database.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite 7
- **Styling**: TailwindCSS v4 (via @tailwindcss/vite plugin)
- **UI Components**: Radix UI primitives + shadcn/ui pattern
- **Routing**: Wouter
- **Data Fetching**: TanStack Query (React Query)
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Animations**: Framer Motion

## Project Structure
```
src/
  App.tsx          - Root app with routing and providers
  main.tsx         - Entry point
  pages/           - Page components (Dashboard, Players, PlayerDetail, EventDetail, Analytics)
  components/      - Shared UI components (Layout, Skeleton, EmptyState, TeamSwitcher, ui/)
  context/         - React contexts (TeamContext, ThemeContext)
  hooks/           - Custom React hooks
  lib/             - Utilities (supabase client, queries, types, utils)
  index.css        - Global styles
```

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL (secret)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public key (secret)

## Development
- Dev server runs on `0.0.0.0:5000`
- Workflow: `npm run dev`

## Deployment
- Static site deployment (build → dist/)
- Build command: `npm run build`
