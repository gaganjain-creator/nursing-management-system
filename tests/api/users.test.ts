/**
 * User endpoint tests
 *
 * GET  /api/users       — Admin only
 * POST /api/users       — Admin only
 * PATCH /api/users/[id] — Admin only
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import { createRouteServer } from "./helpers/server"
import { adminSession, nurseSession, supervisorSession } from "./helpers/sessions"
import { TEST_ADMIN_USER, TEST_NURSE_USER, TEST_SUPERVISOR_USER } from "./helpers/seeds"

// ── module mocks ──────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}))
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }))

import { GET, POST } from "@/app/api/users/route"
import { PATCH } from "@/app/api/users/[id]/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const listApp = createRouteServer(GET as Parameters<typeof createRouteServer>[0])
const createApp = createRouteServer(POST as Parameters<typeof createRouteServer>[0])
const patchApp = createRouteServer(
  PATCH as Parameters<typeof createRouteServer>[0],
  (p) => ({ id: p.split("/").at(-1) ?? "" })
)

const authMock = vi.mocked(auth)
const prismaMock = vi.mocked(prisma)

// ── GET /api/users ────────────────────────────────────────────────────────────
describe("GET /api/users", () => {
  beforeEach(() => {
    authMock.mockResolvedValue(adminSession)
    prismaMock.user.findMany.mockResolvedValue([TEST_ADMIN_USER, TEST_NURSE_USER])
  })

  it("returns 200 with user list for Admin", async () => {
    const res = await request(listApp).get("/")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
  })

  it("returns 401 when no session", async () => {
    authMock.mockResolvedValue(null)
    const res = await request(listApp).get("/")
    expect(res.status).toBe(401)
    expect(res.body.code).toBe("UNAUTHORIZED")
  })

  it("returns 403 for Nurse role", async () => {
    authMock.mockResolvedValue(nurseSession)
    const res = await request(listApp).get("/")
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("FORBIDDEN")
  })

  it("returns 403 for Supervisor role", async () => {
    authMock.mockResolvedValue(supervisorSession)
    const res = await request(listApp).get("/")
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("FORBIDDEN")
  })
})

// ── POST /api/users ───────────────────────────────────────────────────────────
describe("POST /api/users", () => {
  const validPayload = {
    email: "newstaff@nms-test.com",
    password: "SecurePass1!",
    role: "Supervisor",
  }

  beforeEach(() => {
    authMock.mockResolvedValue(adminSession)
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({
      id: "new-user-id",
      email: validPayload.email,
      role: "Supervisor",
      isActive: true,
      createdAt: new Date(),
    })
  })

  it("creates a user and returns 201 for Admin", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(validPayload)
    expect(res.status).toBe(201)
    expect(res.body.email).toBe(validPayload.email)
    expect(res.body.role).toBe("Supervisor")
  })

  it("returns 401 when no session", async () => {
    authMock.mockResolvedValue(null)
    const res = await request(createApp).post("/").send(validPayload)
    expect(res.status).toBe(401)
  })

  it("returns 403 for Supervisor role", async () => {
    authMock.mockResolvedValue(supervisorSession)
    const res = await request(createApp).post("/").send(validPayload)
    expect(res.status).toBe(403)
  })

  it("returns 409 when email is already in use", async () => {
    prismaMock.user.findUnique.mockResolvedValue(TEST_ADMIN_USER)
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(validPayload)
    expect(res.status).toBe(409)
    expect(res.body.code).toBe("DUPLICATE_EMAIL")
  })

  it("returns 400 for invalid email format", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ ...validPayload, email: "bad-email" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when password is too short", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ ...validPayload, password: "short" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 for an invalid role", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ ...validPayload, role: "Receptionist" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when body is empty", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({})
    expect(res.status).toBe(400)
  })
})

// ── PATCH /api/users/[id] ─────────────────────────────────────────────────────
describe("PATCH /api/users/[id]", () => {
  const targetUser = { ...TEST_SUPERVISOR_USER }

  beforeEach(() => {
    authMock.mockResolvedValue(adminSession)
    prismaMock.user.findUnique.mockResolvedValue(targetUser)
    prismaMock.user.update.mockResolvedValue({ ...targetUser, isActive: false })
  })

  it("updates a user's isActive flag and returns 200", async () => {
    const res = await request(patchApp)
      .patch(`/api/users/${targetUser.id}`)
      .set("Content-Type", "application/json")
      .send({ isActive: false })
    expect(res.status).toBe(200)
  })

  it("updates a user's role and returns 200", async () => {
    prismaMock.user.update.mockResolvedValue({ ...targetUser, role: "Management" })
    const res = await request(patchApp)
      .patch(`/api/users/${targetUser.id}`)
      .set("Content-Type", "application/json")
      .send({ role: "Management" })
    expect(res.status).toBe(200)
  })

  it("returns 401 when no session", async () => {
    authMock.mockResolvedValue(null)
    const res = await request(patchApp)
      .patch(`/api/users/${targetUser.id}`)
      .send({ isActive: false })
    expect(res.status).toBe(401)
  })

  it("returns 403 for Nurse role", async () => {
    authMock.mockResolvedValue(nurseSession)
    const res = await request(patchApp)
      .patch(`/api/users/${targetUser.id}`)
      .send({ isActive: false })
    expect(res.status).toBe(403)
  })

  it("returns 403 when Admin tries to modify their own account", async () => {
    // Target id matches the Admin's own id
    const res = await request(patchApp)
      .patch(`/api/users/${adminSession.user.id}`)
      .set("Content-Type", "application/json")
      .send({ isActive: false })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("FORBIDDEN")
  })

  it("returns 403 when trying to promote a non-Admin user to Admin", async () => {
    // targetUser is Supervisor — cannot be promoted to Admin
    const res = await request(patchApp)
      .patch(`/api/users/${targetUser.id}`)
      .set("Content-Type", "application/json")
      .send({ role: "Admin" })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("FORBIDDEN")
  })

  it("returns 404 when user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    const res = await request(patchApp)
      .patch(`/api/users/nonexistent-id`)
      .set("Content-Type", "application/json")
      .send({ isActive: false })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe("NOT_FOUND")
  })

  it("returns 400 for an invalid role value", async () => {
    const res = await request(patchApp)
      .patch(`/api/users/${targetUser.id}`)
      .set("Content-Type", "application/json")
      .send({ role: "Unknown" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })
})
