import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "./lib/auth.config"

const { auth } = NextAuth(authConfig)

function getRoleDashboard(role?: string) {
  const map: Record<string, string> = {
    Admin: "/admin",
    Supervisor: "/supervisor",
    Nurse: "/nurse",
    Management: "/management",
  }

  return map[role ?? ""] ?? "/login"
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname

  const session = req.auth
  const isLoggedIn = !!session
  const role = session?.user?.role

  // Root redirect
  if (pathname === "/") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
  }

  // Login / reset pages
  if (pathname.startsWith("/login") || pathname.startsWith("/reset-password")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
    }

    return NextResponse.next()
  }

  // Protected routes
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)

    return NextResponse.redirect(loginUrl)
  }

  // Role guards
  if (pathname.startsWith("/admin") && role !== "Admin") {
    return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
  }

  if (
    pathname.startsWith("/supervisor") &&
    role !== "Supervisor" &&
    role !== "Admin"
  ) {
    return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
  }

  if (pathname.startsWith("/nurse") && role !== "Nurse") {
    return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
  }

  if (
    pathname.startsWith("/management") &&
    role !== "Management" &&
    role !== "Admin"
  ) {
    return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}