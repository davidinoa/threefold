import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { LIMITS, redactQuoted } from "@/lib/error-reports"

// Exactly the six fields of an error report (system design §4.3), and nothing
// else: an extra field turns the report away.
const ErrorReport = z.strictObject({
  name: z.string().min(1).max(LIMITS.name),
  message: z.string().max(LIMITS.message),
  stack: z.string().max(LIMITS.stack),
  // A pattern like "/shelf", never search params or a fragment.
  route: z
    .string()
    .max(LIMITS.route)
    .regex(/^[^?#]*$/),
  version: z.string().max(LIMITS.version),
  browser: z.string().max(LIMITS.browser),
})

// A full report fits well within this, even with every character escaped.
const MAX_BODY_BYTES = 8192

export const Route = createFileRoute("/api/errors")({
  server: {
    handlers: {
      // No session needed: errors can happen before sign-in.
      POST: async ({ request }) => {
        const declared = Number(request.headers.get("Content-Length") ?? 0)
        if (declared > MAX_BODY_BYTES) {
          return new Response(null, { status: 413 })
        }
        const body = await request.text()
        if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
          return new Response(null, { status: 413 })
        }

        let json: unknown
        try {
          json = JSON.parse(body)
        } catch {
          return new Response(null, { status: 400 })
        }
        // A report that isn't one is dropped without logging it: its body
        // could hold anything.
        const parsed = ErrorReport.safeParse(json)
        if (!parsed.success) return new Response(null, { status: 400 })

        // The client hides quoted text before sending. Doing it again here
        // means a client that missed some still can't put it in the logs.
        const report = {
          ...parsed.data,
          message: redactQuoted(parsed.data.message),
          stack: redactQuoted(parsed.data.stack),
        }
        // One JSON line, which Workers Logs keeps as searchable fields.
        console.log(JSON.stringify({ event: "client-error", ...report }))
        return new Response(null, { status: 204 })
      },
    },
  },
})
