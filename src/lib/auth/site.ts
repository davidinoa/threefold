/** The site passkeys belong to, and the origins that may use it. */
export type Site = {
  /** The RP ID: the hostname a passkey is bound to. */
  rpID: string
  /** The origin of the request being served. One of `origins`. */
  origin: string
  /** Every origin that may use this RP ID. */
  origins: string[]
}

export type SiteConfig = {
  /** The RP ID, or for previews a pattern like "*-threefold.davidinoa.workers.dev". */
  AUTH_RP_ID?: string
  /** The origins that may use it, separated by spaces. Previews leave it out. */
  AUTH_ORIGINS?: string
}

/**
 * The site a request came to, from this environment's config, or nothing if
 * the environment doesn't serve it (system design §2.5).
 *
 * Production and local development name their RP ID and origins. Previews
 * can't, because Cloudflare doesn't tell a preview its own URL. So a
 * preview's config holds a pattern, and the preview uses the hostname it's
 * served on only when it matches. Cloudflare sends a preview only its own
 * hostnames, so a request can't claim another one.
 */
export function siteFor(
  config: SiteConfig,
  requestUrl: string
): Site | undefined {
  const url = new URL(requestUrl)
  const rpID = config.AUTH_RP_ID
  if (!rpID) return undefined

  if (rpID.startsWith("*")) {
    const suffix = rpID.slice(1)
    const name = url.hostname.slice(0, -suffix.length)
    const matches =
      url.protocol === "https:" &&
      url.hostname.endsWith(suffix) &&
      /^[a-z0-9-]+$/.test(name)
    return matches
      ? { rpID: url.hostname, origin: url.origin, origins: [url.origin] }
      : undefined
  }

  const origins = (config.AUTH_ORIGINS ?? "").split(/\s+/).filter(Boolean)
  if (url.hostname !== rpID || !origins.includes(url.origin)) return undefined
  return { rpID, origin: url.origin, origins }
}
