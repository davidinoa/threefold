---
status: accepted
---

# Client data and sync: Dexie, with our own latest-change-wins sync

**Context:** Threefold is local-first (N-2, N-3):

- Every star is saved on the device before any network request.
- The app works offline.
- The server is only a sync target.

**Decision:** the device's copy lives in IndexedDB, read through Dexie 4's live queries, and a small sync of our own keeps devices in step.

**Why:** live queries redraw every screen when a star changes, in any tab, online or not. One person's devices rarely edit the same star at once, so the simplest merge rule is enough.

How the sync works (system design §4.2 and §5.1):

- **The outbox:** each star write also saves an outbox entry in the same transaction, so a star never exists without its "the server hasn't seen this yet" note. An entry leaves the outbox only when the server confirms it.
- **Pulling:** the server numbers every change to an account with a `seq`, and each device pulls everything after its cursor.
- **Conflicts:** when a star changed in two places, the later `updatedAt` wins.
- **Deletes:** taking a star out leaves a tombstone.
- **Emptying the jar:** a `generation` counter tells offline devices that the jar was emptied.

## Considered options

- **TanStack DB,** rejected at 0.9, before its 1.0. By default, its outbox drops a write on a `401`, which would lose stars written before sign-in. Revisit it at 1.0, when it could replace both Dexie and this sync.
- **TanStack Query,** not used. It's built for server state, and stars aren't server state. The only server state, the session and the passkey list, already comes through Better Auth's client.
- **A client store over a thin IndexedDB wrapper,** such as Zustand with `idb`, the earlier plan. It would keep a second copy of the stars in memory, kept in step with IndexedDB by hand, and it wouldn't see changes made in other tabs.

## Consequences

- **An edit can be lost.** When two devices change the same star while offline, the earlier change loses. So can an edit from a device whose clock runs slow. Across one person's devices, that's rare.
- **The protocol is ours** to maintain and test. The PRD's Seam 3 (the server's API) and Seam 1 (end to end) cover it.
- **No background sync.** Not every browser supports it, so a star written offline goes up the next time the app is open with a connection.
