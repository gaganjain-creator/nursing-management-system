import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

function getRoleDashboard(role?: string) {
  const map: Record<string, string> = {
    Admin: "/admin",
    Supervisor: "/supervisor",
    Nurse: "/nurse",
    Management: "/management",
  }

  return map[role ?? ""] ?? "/login"
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isLoggedIn = !!token
  const role = token?.role as string | undefined

  // Root redirect
  if (pathname === "/") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
  }

  // Login / reset pages — redirect away if already logged in
  if (pathname.startsWith("/login") || pathname.startsWith("/reset-password")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
    }

    return NextResponse.next()
  }

  // Protected routes — require authentication
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
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
