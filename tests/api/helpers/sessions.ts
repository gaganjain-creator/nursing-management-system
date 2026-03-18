/**
 * Seeded test sessions — mirror the roles in the system.
 * Import these in tests and pass to vi.mocked(auth).mockResolvedValue(session).
 */
import type { Session } from "next-auth"

export const adminSession: Session = {
  user: {
    id: "test-admin-id",
    email: "admin@nms-test.com",
    role: "Admin",
  },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
}

export const supervisorSession: Session = {
  user: {
    id: "test-supervisor-id",
    email: "supervisor@nms-test.com",
    role: "Supervisor",
  },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
}

export const nurseSession: Session = {
  user: {
    id: "test-nurse-user-id",
    email: "nurse@nms-test.com",
    role: "Nurse",
  },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
}
