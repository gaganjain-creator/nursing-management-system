import { NextRequest } from "next/server"
import crypto from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid email", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const { email } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })

  // Always respond the same — avoid email enumeration
  if (!user || !user.isActive) {
    return Response.json({ message: "If an account exists, a reset link was sent." })
  }

  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password/${token}`
  console.log(`[password-reset] token for ${email}: ${token}`)
  console.log(`[password-reset] reset URL: ${resetUrl}`)

  return Response.json({ message: "If an account exists, a reset link was sent." })
}
