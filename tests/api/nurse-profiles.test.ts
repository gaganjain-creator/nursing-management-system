/**
 * Nurse profile endpoint tests
 *
 * GET   /api/nurse-profiles       — Admin | Supervisor
 * POST  /api/nurse-profiles       — Admin | Supervisor
 * PATCH /api/nurse-profiles/[id]  — Admin | Supervisor | Nurse (own profile)
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import { createRouteServer } from "./helpers/server"
import { adminSession, nurseSession, supervisorSession } from "./helpers/sessions"
import { TEST_NURSE_PROFILE, TEST_NURSE_USER } from "./helpers/seeds"

// ── module mocks ──────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }))
vi.mock("@/lib/supabase", () => ({
  getSupabaseServer: () => ({
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.url/doc" } }),
      }),
    },
  }),
  DOCUMENTS_BUCKET: "nurse-documents",
}))
vi.mock("@/lib/prisma", () => {
  const mockTx = {
    user: { create: vi.fn() },
    nurseProfile: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  }
  return {
    prisma: {
      user: { findUnique: vi.fn(), create: vi.fn() },
      nurseProfile: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      auditLog: { create: vi.fn() },
      $transaction: vi.fn().mockImplementation(async (cb: unknown) => {
        if (typeof cb === "function") return cb(mockTx)
        return Promise.all(cb as Promise<unknown>[])
      }),
    },
  }
})

import { GET, POST } from "@/app/api/nurse-profiles/route"
import { GET as getById, PATCH } from "@/app/api/nurse-profiles/[id]/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const listApp = createRouteServer(GET as Parameters<typeof createRouteServer>[0])
const createApp = createRouteServer(POST as Parameters<typeof createRouteServer>[0])
const getByIdApp = createRouteServer(
  getById as Parameters<typeof createRouteServer>[0],
  (p) => ({ id: p.split("/").at(-1) ?? "" })
)
const patchApp = createRouteServer(
  PATCH as Parameters<typeof createRouteServer>[0],
  (p) => ({ id: p.split("/").at(-1) ?? "" })
)

const authMock = vi.mocked(auth)
const prismaMock = vi.mocked(prisma)

const validCreatePayload = {
  email: "newnnurse@nms-test.com",
  password: "SecurePass1!",
  fullName: "Alice Rn",
  dateOfBirth: "1995-03-20",
  phone: "0400111222",
  address: "2 Nurse Ave, Melbourne VIC 3000",
  emergencyContact: "Bob Rn 0400111333",
  licenseNumber: "RN-NEW-002",
  employmentType: "PartTime",
}

// ── GET /api/nurse-profiles ───────────────────────────────────────────────────
describe("GET /api/nurse-profiles", () => {
  beforeEach(() => {
    authMock.mockResolvedValue(adminSession)
    prismaMock.nurseProfile.findMany.mockResolvedValue([TEST_NURSE_PROFILE])
  })

  it("returns 200 with profile list for Admin", async () => {
    const res = await request(listApp).get("/")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it("returns 200 with profile list for Supervisor", async () => {
    authMock.mockResolvedValue(supervisorSession)
    const res = await request(listApp).get("/")
    expect(res.status).toBe(200)
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

  it("applies search query parameter", async () => {
    const res = await request(listApp).get("/?search=Alice")
    expect(res.status).toBe(200)
    expect(prismaMock.nurseProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    )
  })
})

// ── POST /api/nurse-profiles ──────────────────────────────────────────────────
describe("POST /api/nurse-profiles", () => {
  beforeEach(() => {
    authMock.mockResolvedValue(adminSession)
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.nurseProfile.findUnique.mockResolvedValue(null)
    // $transaction calls tx.user.create then tx.nurseProfile.create
    prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        const tx = {
          user: {
            create: vi.fn().mockResolvedValue({ ...TEST_NURSE_USER, role: "Nurse" }),
          },
          nurseProfile: {
            create: vi.fn().mockResolvedValue({
              id: TEST_NURSE_PROFILE.id,
              fullName: validCreatePayload.fullName,
              licenseNumber: validCreatePayload.licenseNumber,
            }),
          },
        }
        return cb(tx)
      }
      return Promise.all(cb as Promise<unknown>[])
    })
  })

  it("creates nurse profile and returns 201 for Admin", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(validCreatePayload)
    expect(res.status).toBe(201)
    expect(res.body.licenseNumber).toBe(validCreatePayload.licenseNumber)
  })

  it("creates nurse profile and returns 201 for Supervisor", async () => {
    authMock.mockResolvedValue(supervisorSession)
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(validCreatePayload)
    expect(res.status).toBe(201)
  })

  it("returns 403 for Nurse role", async () => {
    authMock.mockResolvedValue(nurseSession)
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(validCreatePayload)
    expect(res.status).toBe(403)
  })

  it("returns 409 when email already in use", async () => {
    prismaMock.user.findUnique.mockResolvedValue(TEST_NURSE_USER)
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(validCreatePayload)
    expect(res.status).toBe(409)
    expect(res.body.code).toBe("DUPLICATE_EMAIL")
  })

  it("returns 409 when license number already registered", async () => {
    prismaMock.nurseProfile.findUnique.mockResolvedValue(TEST_NURSE_PROFILE)
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(validCreatePayload)
    expect(res.status).toBe(409)
    expect(res.body.code).toBe("DUPLICATE_LICENSE")
  })

  it("returns 400 for invalid dateOfBirth format", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ ...validCreatePayload, dateOfBirth: "20/03/1995" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 for invalid employmentType", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ ...validCreatePayload, employmentType: "Casual" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when required fields are missing", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ email: "incomplete@nms-test.com" })
    expect(res.status).toBe(400)
  })
})

// ── PATCH /api/nurse-profiles/[id] ───────────────────────────────────────────
describe("PATCH /api/nurse-profiles/[id]", () => {
  beforeEach(() => {
    authMock.mockResolvedValue(adminSession)
    prismaMock.nurseProfile.findUnique.mockResolvedValue(TEST_NURSE_PROFILE)
    prismaMock.nurseProfile.update.mockResolvedValue({
      ...TEST_NURSE_PROFILE,
      phone: "0499999999",
    })
  })

  it("updates profile fields and returns 200 for Admin", async () => {
    const res = await request(patchApp)
      .patch(`/api/nurse-profiles/${TEST_NURSE_PROFILE.id}`)
      .set("Content-Type", "application/json")
      .send({ phone: "0499999999" })
    expect(res.status).toBe(200)
  })

  it("updates profile status for Supervisor", async () => {
    authMock.mockResolvedValue(supervisorSession)
    prismaMock.nurseProfile.update.mockResolvedValue({
      ...TEST_NURSE_PROFILE,
      status: "Inactive",
    })
    const res = await request(patchApp)
      .patch(`/api/nurse-profiles/${TEST_NURSE_PROFILE.id}`)
      .set("Content-Type", "application/json")
      .send({ status: "Inactive" })
    expect(res.status).toBe(200)
  })

  it("allows Nurse to update their own contact info", async () => {
    authMock.mockResolvedValue(nurseSession)
    // Nurse profile belongs to nurseSession user
    prismaMock.nurseProfile.findUnique.mockResolvedValue(TEST_NURSE_PROFILE)
    const res = await request(patchApp)
      .patch(`/api/nurse-profiles/${TEST_NURSE_PROFILE.id}`)
      .set("Content-Type", "application/json")
      .send({ phone: "0411111111" })
    expect(res.status).toBe(200)
  })

  it("returns 403 when Nurse tries to update another nurse's profile", async () => {
    authMock.mockResolvedValue(nurseSession)
    // findUnique returns null — nurse doesn't own this profile
    prismaMock.nurseProfile.findUnique.mockResolvedValue(null)
    const res = await request(patchApp)
      .patch("/api/nurse-profiles/other-profile-id")
      .set("Content-Type", "application/json")
      .send({ phone: "0411111111" })
    expect(res.status).toBe(403)
  })

  it("returns 404 when profile does not exist", async () => {
    prismaMock.nurseProfile.findUnique.mockResolvedValue(null)
    const res = await request(patchApp)
      .patch("/api/nurse-profiles/nonexistent-id")
      .set("Content-Type", "application/json")
      .send({ phone: "0411111111" })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe("NOT_FOUND")
  })

  it("returns 400 for invalid employmentType value", async () => {
    const res = await request(patchApp)
      .patch(`/api/nurse-profiles/${TEST_NURSE_PROFILE.id}`)
      .set("Content-Type", "application/json")
      .send({ employmentType: "Casual" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 401 when no session", async () => {
    authMock.mockResolvedValue(null)
    const res = await request(patchApp)
      .patch(`/api/nurse-profiles/${TEST_NURSE_PROFILE.id}`)
      .send({ phone: "0411111111" })
    expect(res.status).toBe(401)
  })
})
