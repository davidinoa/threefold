---
status: accepted
---

# Auth: Better Auth with passkey-only sign-up

**Context:** Threefold signs people in with passkeys only, with no passwords and no email (N-5). It needs these, all inside a Cloudflare Worker on D1:

- passkey sign-up without an existing session
- sessions
- passkey management
- account deletion

**Decision:** we use Better Auth with its passkey plugin, `@better-auth/passkey`, mounted as a TanStack Start server route at `/api/auth/$`.

**Why:** it covers every item above, it takes D1 as is, and it fits TanStack Start. So we don't implement WebAuthn, the browser API behind passkeys, ourselves. The system design's §2.5 explains passkeys and the sign-up and sign-in flows.

## Consequences

- **Passkey-only sign-up takes configuration:** `registration.requireSession: false`, with `resolveUser` and `afterVerification` creating the user (checked in 1.7.6).
- **Placeholder identities.** Better Auth requires a unique email and a name on every user, so each user gets placeholders, such as `<id>@users.invalid`.
- **Its own tables.** Better Auth owns `user`, `session`, `passkey`, and a few more in D1. Its CLI can't open a D1 binding, so its SQL is generated against a local SQLite file and committed as a D1 migration.
- **No rollback.** D1 has no interactive transactions, so Better Auth's multi-step writes can't roll back. A sign-up that fails halfway can leave a user with no passkey.
- **The door to encryption stays open.** Passkeys request the PRF extension when they're created, and Better Auth's client strips PRF output before anything reaches the server (system design §7).
- **Not yet proven on the free plan.** The passkey spike (system design §6, question 1) checks that sign-in fits in the free plan's 10 ms of CPU. If it doesn't, a new ADR supersedes this one.
