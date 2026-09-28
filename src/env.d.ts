// Values the build defines for the app (vite.config.ts).
interface ImportMetaEnv {
  /** The commit this build came from, as a short hash, or "dev". */
  readonly VITE_BUILD_ID: string
}
