import type { CDPSession, Page } from "@playwright/test"

/** A virtual passkey device in Chromium, driven through the DevTools Protocol. */
export type PasskeyDevice = { cdp: CDPSession; authenticatorId: string }

/**
 * Gives a page a virtual passkey device with resident keys, user
 * verification, and PRF (PRD, Testing Decisions). WebKit has none, so
 * passkey journeys run in Chromium only.
 */
export async function passkeyDevice(page: Page): Promise<PasskeyDevice> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("WebAuthn.enable")
  const { authenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        hasPrf: true,
      },
    }
  )
  return { cdp, authenticatorId }
}

/**
 * Copies every passkey on one device to another, the way a synced password
 * manager would. Returns how many it copied.
 */
export async function syncPasskeys(from: PasskeyDevice, to: PasskeyDevice) {
  const { credentials } = await from.cdp.send("WebAuthn.getCredentials", {
    authenticatorId: from.authenticatorId,
  })
  for (const credential of credentials) {
    await to.cdp.send("WebAuthn.addCredential", {
      authenticatorId: to.authenticatorId,
      credential,
    })
  }
  return credentials.length
}

/**
 * Keeps a new jar with a passkey, the way the app will: Better Auth's
 * endpoints, and the browser's WebAuthn API. Returns the registration options
 * the server sent, and how it answered the new passkey.
 */
export function keepJar(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/auth/passkey/generate-register-options")
    const options: PublicKeyCredentialCreationOptionsJSON =
      await response.json()
    const credential = await navigator.credentials.create({
      publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
    })
    if (!(credential instanceof PublicKeyCredential)) {
      throw new TypeError("No passkey was made")
    }
    const verified = await fetch("/api/auth/passkey/verify-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response: credential.toJSON(),
        createSession: true,
      }),
    })
    return { options, status: verified.status }
  })
}

/** Opens a kept jar with a passkey this device holds. Returns the server's answer. */
export function openJar(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch(
      "/api/auth/passkey/generate-authenticate-options"
    )
    const options: PublicKeyCredentialRequestOptionsJSON = await response.json()
    const credential = await navigator.credentials.get({
      publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
    })
    if (!(credential instanceof PublicKeyCredential)) {
      throw new TypeError("No passkey was used")
    }
    const verified = await fetch("/api/auth/passkey/verify-authentication", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: credential.toJSON() }),
    })
    return verified.status
  })
}

export type SignedIn = {
  session: { ipAddress?: string | null; userAgent?: string | null }
  user: { id: string; email: string; name: string }
} | null

/** The session this page is signed in with, if any. */
export function sessionOf(page: Page) {
  return page.evaluate(async (): Promise<SignedIn> => {
    const response = await fetch("/api/auth/get-session")
    return response.json()
  })
}
