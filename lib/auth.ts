import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/lib/auth.config"

class AccountNotActiveError extends CredentialsSignin {
  code = "AccountNotActive"
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        console.log("[auth] login attempt:", parsed.data.email)

        let user
        try {
          user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
          })
        } catch (e) {
          console.error("[auth] DB error in findUnique:", e)
          return null
        }

        console.log("[auth] user found:", user ? `yes (active=${user.isActive})` : "no")

        if (!user) return null

        if (!user.isActive) {
          throw new AccountNotActiveError()
        }

        let passwordValid: boolean
        try {
          passwordValid = await bcrypt.compare(
            parsed.data.password,
            user.passwordHash
          )
        } catch (e) {
          console.error("[auth] bcrypt error:", e)
          return null
        }

        console.log("[auth] bcrypt.compare result:", passwordValid)

        if (!passwordValid) return null

        // Update last login time (non-blocking)
        prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch((e) => console.error("[auth] lastLoginAt update failed:", e))

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
})
