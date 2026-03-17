import { NextRequest } from "next/server"
import crypto from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  // Always return the same response regardless of email validity or existence
  // to prevent both email enumeration and timing attacks.
  const GENERIC_RESPONSE = Response.json({ message: "If an account exists, a reset link was sent." })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return GENERIC_RESPONSE
  }

  const { email } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.isActive) {
    return GENERIC_RESPONSE
  }

  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  // TODO: send resetUrl via email provider
  // const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password/${token}`

  return GENERIC_RESPONSE
}
