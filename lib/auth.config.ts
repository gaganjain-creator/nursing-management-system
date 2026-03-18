import type { NextAuthConfig } from "next-auth"
import type { Role } from "@/lib/types"

/**
 * Edge-safe NextAuth configuration
 * IMPORTANT:
 * - No Prisma
 * - No database access
 * - No bcrypt
 * This file is used by middleware (Edge runtime)
 */

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },

  pages: {
    signIn: "/login",
  },

  providers: [],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { id: string; role: Role }).role
      }
      return token
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
}