import { passkey } from "@better-auth/passkey"
import type { BetterAuthOptions } from "better-auth"

import type { Site } from "./site"

// Better Auth, set up for passkeys only (ADR 0001, system design §2.5). The
// Worker, the migration script, and the tests all build on these options, so
// the tables and the behavior can't drift apart.

const DAY = 60 * 60 * 24

type RegistrationExtensions = NonNullable<
  NonNullable<Parameters<typeof passkey>[0]>["registration"]
>["extensions"]

/**
 * The name a new jar's passkey shows in the password manager. Every account
 * needs one, and there's no email or name to use.
 */
const ACCOUNT_NAME = "Threefold"

const DEVICES: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Macintosh|Mac OS X/, "Mac"],
  [/Windows/, "Windows"],
  [/CrOS/, "Chromebook"],
  [/Linux/, "Linux"],
]

/** A coarse name for the device a passkey was made on, such as "iPhone". */
export function deviceLabel(userAgent: string): string {
  return DEVICES.find(([pattern]) => pattern.test(userAgent))?.[1] ?? "Passkey"
}

export function authOptions(site: Site) {
  return {
    appName: "Threefold",
    baseURL: site.origin,
    trustedOrigins: site.origins,
    // Off unless asked for; saying so here keeps it off.
    telemetry: { enabled: false },
    // A year, renewed at most daily as the app is used. Chrome caps cookies
    // at 400 days.
    session: { expiresIn: 365 * DAY, updateAge: DAY },
    // Nothing that identifies anyone is stored (N-5): no IP address, and no
    // user agent on sessions.
    advanced: { ipAddress: { disableIpTracking: true } },
    databaseHooks: {
      session: {
        create: {
          before: (session) =>
            Promise.resolve({ data: { ...session, userAgent: null } }),
        },
      },
    },
    plugins: [
      passkey({
        rpID: site.rpID,
        rpName: "Threefold",
        // Set, so the plugin never falls back to the request's Origin header.
        origin: site.origins,
        // Discoverable, so "Open my jar" needs no username.
        authenticatorSelection: { residentKey: "required" },
        registration: {
          // Keeping a jar is how an account starts: there's no session yet.
          requireSession: false,
          resolveUser: () => ({ id: crypto.randomUUID(), name: ACCOUNT_NAME }),
          // Only once the passkey checks out does the account exist. Better
          // Auth needs an email, so it gets one that can't receive mail.
          afterVerification: async ({ ctx, user }) => {
            const created = await ctx.context.internalAdapter.createUser(
              { email: `${user.id}@users.invalid`, name: ACCOUNT_NAME },
              { method: "passkey" }
            )
            return {
              userId: created.id,
              name: deviceLabel(ctx.headers?.get("User-Agent") ?? ""),
            }
          },
          // Asked for now, so today's passkeys can carry end-to-end
          // encryption later (system design §7). Nothing secret comes back
          // until a sign-in asks for PRF output. SimpleWebAuthn's types
          // predate PRF, but it passes extensions to the browser as they are.
          extensions: { prf: {} } as RegistrationExtensions,
        },
      }),
    ],
  } satisfies BetterAuthOptions
}
