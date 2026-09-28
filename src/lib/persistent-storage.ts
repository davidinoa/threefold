/**
 * Asks the browser to keep this site's storage when the device runs short of
 * space, and says whether it will (system design §5.4). Today asks after the
 * first star lands. Browsers grant it by their own rules, so a no is normal.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!("storage" in navigator) || !("persist" in navigator.storage)) {
    return false
  }
  try {
    return (
      (await navigator.storage.persisted()) ||
      (await navigator.storage.persist())
    )
  } catch {
    return false
  }
}
