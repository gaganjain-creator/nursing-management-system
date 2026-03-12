# Nursing Management System (NMS)

AI-assisted web platform for healthcare facilities to manage nurses, shifts, compliance, and scheduling.

## Stack
- **Next.js 14+** App Router + TypeScript
- **Prisma ORM** + Supabase PostgreSQL
- **NextAuth.js v5** — JWT, Credentials provider
- **TailwindCSS v4** + shadcn/ui components
- **Supabase Storage** — `nurse-documents` bucket
- **Vercel** — auto-deploy from GitHub

## Roles
| Role | Access |
|------|--------|
| Admin | Full platform access |
| Supervisor | Nurse profiles, compliance, scheduling, requests |
| Nurse | Own shifts, availability, documents, requests |
| Management | Read-only reports & dashboards |

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase project (free tier)

### 1. Clone & install
```bash
git clone <repo-url>
cd nursing-management-system
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Fill in `.env.local`:
- `DATABASE_URL` — Supabase pooler connection string (port **6543**)
- `DIRECT_URL` — Supabase direct connection string (port **5432**)
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-side only)
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev

### 3. Set up the database
```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase (first time / no migration history)
npm run db:push

# OR use migrations
npm run db:migrate
```

### 4. Create the Supabase Storage bucket
In your Supabase dashboard → Storage → New bucket:
- Name: `nurse-documents`
- Public: **No** (private, signed URLs only)

### 5. Seed the database
```bash
npm run db:seed
```

Test accounts (password: `Password123!`):
| Email | Role |
|-------|------|
| admin@nms.local | Admin |
| supervisor@nms.local | Supervisor |
| nurse@nms.local | Nurse |
| management@nms.local | Management |

### 6. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

## Project Structure
```
/app
  /(auth)/login           → Sign-in page
  /(auth)/reset-password  → Password reset
  /(dashboard)/layout.tsx → Shell with sidebar + header
  /(dashboard)/admin      → Admin pages
  /(dashboard)/supervisor → Supervisor pages
  /(dashboard)/nurse      → Nurse pages
  /(dashboard)/management → Management pages
  /api/auth/[...nextauth] → NextAuth handlers
/components
  /ui                     → shadcn/ui base components
  /shared                 → App-specific components (Sidebar, Header)
/lib
  prisma.ts               → Prisma client singleton
  supabase.ts             → Supabase server + public clients
  auth.ts                 → NextAuth full config (Node.js runtime)
  auth.config.ts          → NextAuth edge-safe config (middleware)
  utils.ts                → cn(), formatDate(), etc.
/prisma
  schema.prisma           → Full data model
  seed.ts                 → Seed script
/types
  next-auth.d.ts          → Session type augmentation
/middleware.ts            → RBAC route protection
```

## Key Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed test data
npm run db:studio    # Open Prisma Studio
```

## Deployment (Vercel)
1. Push to GitHub
2. Import project in Vercel dashboard
3. Set all environment variables from `.env.example`
4. Set `NEXTAUTH_URL` to your Vercel production URL
5. Deploy — Vercel handles the build automatically

> Do **not** create a Dockerfile. Vercel builds Next.js natively.
