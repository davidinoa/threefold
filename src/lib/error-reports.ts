// Error reports, the one way client errors reach the server (N-11, system
// design §4.3). A report has six fields, trimmed so that no line you wrote
// rides along.

export type ErrorReport = {
  /** The error's name, such as "TypeError". */
  name: string
  /** With quoted text replaced by "…". */
  message: string
  /** With quoted text replaced by "…". */
  stack: string
  /** The route's pattern, such as "/shelf". Never search params. */
  route: string
  /** The build id. */
  version: string
  /** Coarse, such as "Chrome 141, macOS". */
  browser: string
}

/** The longest each field may be. The server turns away anything longer. */
export const LIMITS = {
  name: 100,
  message: 200,
  stack: 2000,
  route: 200,
  version: 40,
  browser: 60,
} as const satisfies Record<keyof ErrorReport, number>

/** At most this many reports leave a page load (system design §4.3). */
export const REPORTS_PER_PAGE = 5

// A quote with its closing mark, or an opening mark with none, which hides
// the rest of the text. An apostrophe inside a word, as in "can't", isn't a
// quote.
const QUOTED =
  /("[^"]*"|(?<![\p{L}\p{N}])'[^']*'|`[^`]*`|“[^”]*”|‘[^’]*’)|(?:["`“]|(?<![\p{L}\p{N}])['‘])[\s\S]*/gu

/**
 * Replaces quoted text with "…". Error messages sometimes quote the data that
 * caused them, which could be a line you wrote.
 */
export function redactQuoted(text: string): string {
  return text.replace(QUOTED, (match, closed?: string) =>
    closed === undefined ? `${match[0]}…` : `${match[0]}…${match.at(-1)}`
  )
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

type Context = Pick<ErrorReport, "route" | "version" | "browser">

/** Turns anything thrown into a report. */
export function toReport(error: unknown, context: Context): ErrorReport {
  const where = {
    route: truncate(context.route, LIMITS.route),
    version: truncate(context.version, LIMITS.version),
    browser: truncate(context.browser, LIMITS.browser),
  }
  // A thrown value that isn't an Error could be anything, even a line you
  // wrote, so only its type is sent.
  if (!(error instanceof Error)) {
    return {
      name: "NonError",
      message: `Thrown ${typeof error}`,
      stack: "",
      ...where,
    }
  }
  return {
    name: truncate(redactQuoted(error.name), LIMITS.name),
    message: truncate(redactQuoted(error.message), LIMITS.message),
    stack: truncate(redactQuoted(error.stack ?? ""), LIMITS.stack),
    ...where,
  }
}

const BROWSERS: [RegExp, string][] = [
  [/Edg(?:A|iOS)?\/(\d+)/, "Edge"],
  [/(?:Chrome|CriOS)\/(\d+)/, "Chrome"],
  [/(?:Firefox|FxiOS)\/(\d+)/, "Firefox"],
  [/Version\/(\d+).*Safari/, "Safari"],
]

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Macintosh|Mac OS X/, "macOS"],
  [/Windows/, "Windows"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
]

/** The browser's name, major version, and system, such as "Chrome 141, macOS". */
export function coarseBrowser(userAgent: string): string {
  let browser = "Other browser"
  for (const [pattern, name] of BROWSERS) {
    const match = pattern.exec(userAgent)
    if (match) {
      browser = `${name} ${match[1]}`
      break
    }
  }
  const system =
    SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? "other system"
  return `${browser}, ${system}`
}

/** Sends at most `limit` reports, then drops the rest. */
export function createReporter(
  send: (report: ErrorReport) => void,
  context: () => Context,
  limit = REPORTS_PER_PAGE
): (error: unknown) => void {
  let sent = 0
  return (error) => {
    if (sent >= limit) return
    sent += 1
    send(toReport(error, context()))
  }
}

let report: ((error: unknown) => void) | undefined
let routeOf = () => "unknown"

/**
 * Reports this page's uncaught errors and unhandled rejections. Call it once
 * the router exists, in the browser only.
 */
export function installErrorReporting(currentRoute: () => string): void {
  routeOf = currentRoute
  if (report) return
  report = createReporter(
    (errorReport) => {
      // keepalive lets a report finish while the page closes. A report that
      // fails is dropped: reporting that failure would only fail too.
      void fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorReport),
        keepalive: true,
      }).catch(() => undefined)
    },
    () => ({
      route: routeOf(),
      version: import.meta.env.VITE_BUILD_ID,
      browser: coarseBrowser(navigator.userAgent),
    })
  )
  const reportIt = report
  window.addEventListener("error", (event) => reportIt(event.error))
  window.addEventListener("unhandledrejection", (event) =>
    reportIt(event.reason)
  )
}

/**
 * Reports an error that a route's error boundary caught, which never reaches
 * the window's error event.
 */
export function reportCaughtError(error: unknown): void {
  report?.(error)
}
