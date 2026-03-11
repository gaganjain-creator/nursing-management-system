# CLAUDE.md — Project Rules for Nursing Management Software
# Claude Code reads this file automatically every session.
# Place this file in the ROOT of your project folder.

## STACK (Non-Negotiable — no alternatives, no paid services)
- Frontend:    Next.js 14+ App Router + TypeScript
- Styling:     TailwindCSS + shadcn/ui
- Database:    Supabase PostgreSQL (via Prisma ORM)
- Auth:        NextAuth.js v5 (JWT strategy)
- File Store:  Supabase Storage (NOT AWS S3)
- API:         RESTful — Next.js API Routes only
- Hosting:     Vercel (free tier, GitHub auto-deploy)
- Testing:     Vitest + React Testing Library

## SUPABASE RULES
- Use @supabase/supabase-js for Storage operations only.
- Use Prisma (not Supabase client) for ALL database queries.
- Prisma schema must have both url (pooler) and directUrl.
- File uploads go to Supabase Storage bucket "nurse-documents".
- Use createSignedUrl() for reading files (1 hour expiry).
- Never expose SUPABASE_SERVICE_ROLE_KEY to the client.

## VERCEL RULES
- Do not create a Dockerfile — Vercel builds Next.js natively.
- Do not create GitHub Actions for deployment — Vercel handles it.
- Environment variables are set in Vercel dashboard, not in code.
- NEXTAUTH_URL must be set to the Vercel production URL.

## CODE STYLE
- Always use TypeScript. No "any" types.
- Use async/await, never .then() chains.
- Validate all API inputs with Zod before processing.
- Named exports for components; default export for page files only.
- Keep components under 200 lines. Split if larger.

## ARCHITECTURE RULES
- Server Components for data fetching by default.
- Add "use client" only when hooks/interactivity needed.
- Never call the database directly from a Client Component.
- RBAC enforced server-side in every API route (not just UI).
- File uploads: client calls /api/upload/signed-url,
  server returns Supabase signed upload URL,
  client uploads directly to Supabase Storage.

## FILE NAMING
- Components:  PascalCase  -> NurseProfileCard.tsx
- Hooks:       camelCase   -> useNotifications.ts
- API routes:  kebab-case  -> /api/nurse-profiles/route.ts
- Utilities:   camelCase   -> formatDate.ts
- Env vars:    UPPER_SNAKE -> DATABASE_URL

## WHAT NOT TO DO
- Do NOT use AWS S3 or any paid cloud storage.
- Do NOT build custom auth. Use NextAuth.
- Do NOT use localStorage for state. Use React state.
- Do NOT build WebSockets. Use 45s polling for notifications.
- Do NOT activate multi-tenancy in MVP.
  Add tenant_id columns, scope queries, but do not activate.
- Do NOT write raw SQL for basic CRUD. Use Prisma client.
- Do NOT create a Dockerfile or cloud deploy scripts.
  Vercel handles all of this automatically.

## ERROR HANDLING
- All API errors return: { error: string, code: string }
- Use correct HTTP codes: 400, 401, 403, 404, 500.

## AUDIT LOGGING
- Write to AuditLog on every create, update, delete.
- Include: userId, action, entityType, entityId,
  oldValues (JSON), newValues (JSON), createdAt.

## COMMIT RULES
- Commit after each working feature.
- Prefix: feat: | fix: | chore: | refactor: | test:
- Never commit .env.local files.
