/**
 * Auth endpoint tests
 *
 * POST /api/auth/forgot-password
 * POST /api/auth/reset-password
 *
 * NOTE: POST /api/auth/login is handled entirely by NextAuth's built-in
 * credentials callback at /api/auth/callback/credentials. It is not a
 * custom route and cannot be tested via a standalone route handler.
 * Login behaviour is covered indirectly by the 401 / session-guard tests
 * in each resource test file.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import { createRouteServer } from "./helpers/server"
import { TEST_NURSE_USER, TEST_RESET_TOKEN } from "./helpers/seeds"

// ── module mocks (hoisted) ────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { POST as forgotPost } from "@/app/api/auth/forgot-password/route"
import { POST as resetPost } from "@/app/api/auth/reset-password/route"
import { prisma } from "@/lib/prisma"

const forgotApp = createRouteServer(forgotPost as Parameters<typeof createRouteServer>[0])
const resetApp = createRouteServer(resetPost as Parameters<typeof createRouteServer>[0])

const prismaMock = vi.mocked(prisma)

// ── helpers ───────────────────────────────────────────────────────────────────
function json(app: ReturnType<typeof createRouteServer>, path: string, body: unknown) {
  return request(app).post(path).set("Content-Type", "application/json").send(body)
}

// ── forgot-password ───────────────────────────────────────────────────────────
describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(TEST_NURSE_USER)
    prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.passwordResetToken.create.mockResolvedValue(TEST_RESET_TOKEN)
  })

  it("returns generic 200 message for a valid existing email", async () => {
    const res = await json(forgotApp, "/", { email: "nurse@nms-test.com" })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/reset link/i)
  })

  it("returns the same generic message for a non-existent email (no enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    const res = await json(forgotApp, "/", { email: "ghost@nms-test.com" })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/reset link/i)
  })

  it("returns generic message for an inactive user (no enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...TEST_NURSE_USER, isActive: false })
    const res = await json(forgotApp, "/", { email: "nurse@nms-test.com" })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/reset link/i)
  })

  it("returns generic message for an invalid email format (no enumeration)", async () => {
    const res = await json(forgotApp, "/", { email: "not-an-email" })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/reset link/i)
  })

  it("returns generic message when body is completely missing", async () => {
    const res = await json(forgotApp, "/", {})
    expect(res.status).toBe(200)
  })

  it("deletes any previous reset token before creating a new one", async () => {
    await json(forgotApp, "/", { email: "nurse@nms-test.com" })
    expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: TEST_NURSE_USER.id },
    })
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalled()
  })
})

// ── reset-password ────────────────────────────────────────────────────────────
describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(TEST_RESET_TOKEN)
    prismaMock.$transaction.mockImplementation(async (ops: unknown) => {
      if (Array.isArray(ops)) return Promise.all(ops)
      return ops
    })
    prismaMock.passwordResetToken.delete.mockResolvedValue(TEST_RESET_TOKEN)
    prismaMock.user.update.mockResolvedValue(TEST_NURSE_USER)
  })

  it("resets password with a valid token", async () => {
    const res = await json(resetApp, "/", {
      token: "valid-reset-token-abc123",
      password: "NewPassword1!",
    })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/password updated/i)
  })

  it("returns 400 for an unknown token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null)
    const res = await json(resetApp, "/", {
      token: "bad-token",
      password: "NewPassword1!",
    })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("INVALID_TOKEN")
  })

  it("returns 400 for an expired token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      ...TEST_RESET_TOKEN,
      expiresAt: new Date(Date.now() - 1000),
    })
    prismaMock.passwordResetToken.delete.mockResolvedValue(TEST_RESET_TOKEN)
    const res = await json(resetApp, "/", {
      token: "expired-token",
      password: "NewPassword1!",
    })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("TOKEN_EXPIRED")
  })

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await json(resetApp, "/", {
      token: "valid-reset-token-abc123",
      password: "short",
    })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when token is missing", async () => {
    const res = await json(resetApp, "/", { password: "NewPassword1!" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when password is missing", async () => {
    const res = await json(resetApp, "/", { token: "some-token" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("deletes the token atomically so it cannot be reused", async () => {
    await json(resetApp, "/", {
      token: "valid-reset-token-abc123",
      password: "NewPassword1!",
    })
    expect(prismaMock.$transaction).toHaveBeenCalled()
  })
})
