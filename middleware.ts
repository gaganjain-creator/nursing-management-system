import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

function getRoleDashboard(role: string): string {
  const map: Record<string, string> = {
    Admin: "/admin",
    Supervisor: "/supervisor",
    Nurse: "/nurse",
    Management: "/management",
  }
  return map[role] ?? "/login"
}

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role as string | undefined
  const path = req.nextUrl.pathname

  // Root redirect
  if (path === "/") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.nextUrl))
    }
    return NextResponse.redirect(new URL(getRoleDashboard(role ?? ""), req.nextUrl))
  }

  // Auth pages — redirect to dashboard if already logged in
  if (path === "/login" || path.startsWith("/reset-password")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(getRoleDashboard(role ?? ""), req.nextUrl))
    }
    return NextResponse.next()
  }

  // All other routes require authentication
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl)
    loginUrl.searchParams.set("callbackUrl", path)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based route guards
  const currentRole = role ?? ""

  if (path.startsWith("/admin") && currentRole !== "Admin") {
    return NextResponse.redirect(new URL(getRoleDashboard(currentRole), req.nextUrl))
  }

  if (
    path.startsWith("/supervisor") &&
    currentRole !== "Supervisor" &&
    currentRole !== "Admin"
  ) {
    return NextResponse.redirect(new URL(getRoleDashboard(currentRole), req.nextUrl))
  }

  if (path.startsWith("/nurse") && currentRole !== "Nurse") {
    return NextResponse.redirect(new URL(getRoleDashboard(currentRole), req.nextUrl))
  }

  if (
    path.startsWith("/management") &&
    currentRole !== "Management" &&
    currentRole !== "Admin"
  ) {
    return NextResponse.redirect(new URL(getRoleDashboard(currentRole), req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|public).*)"],
}
