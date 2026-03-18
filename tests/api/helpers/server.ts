/**
 * HTTP bridge: wraps a Next.js App Router route handler in a node:http
 * server so Supertest can make real HTTP requests against it.
 *
 * Usage:
 *   const app = createRouteServer(GET)
 *   await request(app).get('/').expect(200)
 *
 * For dynamic-param routes pass an extractor:
 *   const app = createRouteServer(PATCH, (p) => ({ id: p.split('/').at(-1)! }))
 */
import http from "node:http"
import { NextRequest } from "next/server"

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<Response>

export function createRouteServer(
  handler: RouteHandler,
  extractParams: (pathname: string) => Record<string, string> = () => ({})
): http.Server {
  return http.createServer(async (nodeReq, nodeRes) => {
    const chunks: Buffer[] = []
    nodeReq.on("data", (chunk: Buffer) => chunks.push(chunk))
    await new Promise<void>((resolve) => nodeReq.on("end", resolve))

    const body = Buffer.concat(chunks)
    const url = `http://localhost${nodeReq.url ?? "/"}`
    const pathname = new URL(url).pathname

    const headers = new Headers()
    for (const [key, value] of Object.entries(nodeReq.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : value)
      }
    }

    const nextReq = new NextRequest(url, {
      method: nodeReq.method ?? "GET",
      headers,
      body: body.length > 0 ? body : null,
    })

    const params = extractParams(pathname)

    try {
      const response = await handler(nextReq, {
        params: Promise.resolve(params),
      })
      nodeRes.statusCode = response.status
      response.headers.forEach((value, key) => nodeRes.setHeader(key, value))
      const text = await response.text()
      nodeRes.end(text)
    } catch (err) {
      console.error("[test-server] unhandled handler error:", err)
      nodeRes.statusCode = 500
      nodeRes.end(JSON.stringify({ error: "Internal server error" }))
    }
  })
}
