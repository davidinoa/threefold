---
status: accepted
---

# Host and database: Cloudflare Workers Free with D1

**Context:** nothing may cost money while Threefold has few users (N-6). The server's jobs are small: send the app's static shell, handle passkeys, and sync stars.

**Decision:** we run one Cloudflare Worker on the free Workers plan, with D1, Cloudflare's SQLite database, bound to it.

**Why:**

- The free plan can't bill us. Past a daily limit, requests fail until the reset.
- D1 binds to the Worker with no connection string, and Better Auth accepts it as is.
- It runs locally and in CI without Docker.
- Each Worker Preview can bind its own copy.

## Consequences

- **The free limits shape the design** (system design §5.2). They're shared with the other Workers on the same Cloudflare account:
  - 100,000 requests a day, not counting static files
  - 10 ms of CPU per request
  - 50 external subrequests per request
  - 50 D1 queries per request
  - 100 bound parameters per D1 statement
  - 5 million rows read and 100,000 rows written a day
  - 7 days of Time Travel, D1's point-in-time restore
- **Per-account caps** keep one account, or one bug, from using up everyone's allowance.
  - The starting values are 100 changes per sync request and 300 star changes a day.
  - There's also a burst limit, if the free plan allows one.
- **SQLite, not Postgres.** There are no interactive transactions, so writes that must land together go in one `batch()`. Moving to Postgres later means migrating both the schema and the data.
- **One primary region.** Writes go through the outbox in the background, so the distance adds no delay anyone notices.
- **Usage needs watching.** A monthly check of Workers and D1 usage against these limits rides on the pinned end-to-end encryption issue (system design §5.9).
