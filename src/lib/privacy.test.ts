import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { parseAst } from "vite"
import { describe, expect, it } from "vitest"

import { ENCRYPTED } from "./privacy"

// Claims that only you can read your stars, from the PRD's "Voice and copy
// rules". The copy may not make them until encryption ships (N-4).
const CLAIMS = [
  /not even us/,
  /only you can (open|read)/,
  /nobody else reads/,
  /(can't|cannot|can not) read your/,
  /zero[- ]knowledge/,
  /encrypt/,
]

function claimsIn(text: string) {
  const normalized = text
    .toLowerCase()
    .replaceAll(/[‘’]/g, "'")
    .replaceAll(/\s+/g, " ")
  return CLAIMS.filter((claim) => claim.test(normalized)).map(String)
}

type Node = { type: string; [key: string]: unknown }

function isNode(value: unknown): value is Node {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  )
}

// Strings that are code, not copy: module paths and literal types.
const NOT_COPY = new Set([
  "ImportDeclaration",
  "ExportAllDeclaration",
  "ExportNamedDeclaration",
  "ImportExpression",
  "TSExternalModuleReference",
  "TSImportType",
  "TSLiteralType",
])

/** What a source file shows people: strings, template text, and JSX text. */
function copyIn(source: string, filename: string) {
  const program = parseAst(
    source,
    { lang: filename.endsWith(".tsx") ? "tsx" : "ts" },
    filename
  ) as unknown as Node
  const copy: string[] = []
  const visit = (node: Node, parent?: Node) => {
    if (node.type === "Literal" && typeof node.value === "string") {
      if (!parent || !NOT_COPY.has(parent.type)) copy.push(node.value)
    } else if (node.type === "JSXText" && typeof node.value === "string") {
      copy.push(node.value)
    } else if (node.type === "TemplateElement") {
      const { cooked, raw } = node.value as {
        cooked: string | null
        raw: string
      }
      copy.push(cooked ?? raw)
    }
    for (const child of Object.values(node)) {
      for (const item of Array.isArray(child) ? child : [child]) {
        if (isNode(item)) visit(item, node)
      }
    }
  }
  visit(program)
  return copy
}

function filesIn(dir: string, extensions: RegExp) {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => extensions.test(file))
    .map((file) => join(dir, file))
}

describe.skipIf(ENCRYPTED)("honest privacy wording (N-4)", () => {
  it("finds a claim wherever copy can hold one", () => {
    const sample = `
      export const Hello = () => (
        <p title="Only you can read these">We can’t read your stars. Not even us.</p>
      )
      toast(\`Stored with zero-knowledge \${"proof"}\`)
    `
    expect(copyIn(sample, "sample.tsx").flatMap(claimsIn)).toEqual([
      "/only you can (open|read)/",
      "/not even us/",
      "/(can't|cannot|can not) read your/",
      "/zero[- ]knowledge/",
    ])
  })

  it("ignores code: names, comments, module paths, and types", () => {
    const sample = `
      // Until encryption ships, nothing here is encrypted.
      import { ENCRYPTED } from "@/lib/encrypt"
      type Mode = "encrypted" | "plain"
      export const isEncrypted = (mode: Mode) => ENCRYPTED && mode.length > 0
    `
    expect(copyIn(sample, "sample.ts").flatMap(claimsIn)).toEqual([])
  })

  it("keeps the app's copy, the manifest, and the shell honest", () => {
    const sources = filesIn("src", /(?<!\.test)\.tsx?$/)
      .filter((file) => !file.endsWith(".d.ts"))
      .flatMap((file) =>
        copyIn(readFileSync(file, "utf8"), file).map((text) => ({ file, text }))
      )
    // The manifest and anything else public/ serves as text.
    const served = filesIn("public", /\.(json|webmanifest|txt|html|svg)$/).map(
      (file) => ({ file, text: readFileSync(file, "utf8") })
    )
    const claims = [...sources, ...served].flatMap(({ file, text }) =>
      claimsIn(text).map((claim) => ({ file, claim, text }))
    )
    expect(claims).toEqual([])
  })
})
