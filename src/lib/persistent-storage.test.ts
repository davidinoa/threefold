import { afterEach, describe, expect, it, vi } from "vitest"

import { requestPersistentStorage } from "./persistent-storage"

function storageThat(persisted: boolean, persist: () => Promise<boolean>) {
  const manager = {
    persisted: vi.fn<() => Promise<boolean>>(() => Promise.resolve(persisted)),
    persist: vi.fn<() => Promise<boolean>>(persist),
  }
  vi.stubGlobal("navigator", { storage: manager })
  return manager
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("requestPersistentStorage", () => {
  it("asks, and passes on the browser's answer", async () => {
    const yes = storageThat(false, () => Promise.resolve(true))
    expect(await requestPersistentStorage()).toBe(true)
    expect(yes.persist).toHaveBeenCalledOnce()

    storageThat(false, () => Promise.resolve(false))
    expect(await requestPersistentStorage()).toBe(false)
  })

  it("doesn't ask again once storage is persistent", async () => {
    const storage = storageThat(true, () => Promise.resolve(true))
    expect(await requestPersistentStorage()).toBe(true)
    expect(storage.persist).not.toHaveBeenCalled()
  })

  it("takes a browser without the API, or an error, as a no", async () => {
    vi.stubGlobal("navigator", {})
    expect(await requestPersistentStorage()).toBe(false)

    storageThat(false, () => Promise.reject(new Error("Not allowed")))
    expect(await requestPersistentStorage()).toBe(false)
  })
})
