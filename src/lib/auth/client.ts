import { passkeyClient } from "@better-auth/passkey/client"
import { createAuthClient } from "better-auth/react"

// The app's side of Better Auth, on this origin's /api/auth (system design
// §4.1). Keeping a jar calls authClient.passkey.addPasskey with
// createSession: true; opening one calls authClient.signIn.passkey().
export const authClient = createAuthClient({ plugins: [passkeyClient()] })
