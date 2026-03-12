import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const rawUrl = process.env.DATABASE_URL ?? ""
  const isSupabase = rawUrl.includes("supabase")

  // Strip sslmode from URL — pg v8 treats sslmode=require as verify-full,
  // which rejects Supabase's self-signed cert chain. We set ssl explicitly instead.
  const connectionString = rawUrl.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "")

  const pool = new Pool({
    connectionString,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
