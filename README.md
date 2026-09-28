# Threefold

A phone-first web app for a gratitude journal, built as a small daily ritual. Each day asks for three lines about one of eight categories, and each line folds into a paper star that drops into this month's jar.

Threefold is being set up: tooling, checks, and deploys come before product code. [The PRD](docs/PRD.md) describes the product, and [the system design](docs/SYSTEM_DESIGN.md) describes how it's built.

## Privacy, honestly

- What you write is saved on your device first, so the app is instant and works offline.
- Keeping your jar with a passkey syncs it across your devices through Threefold's server. The server stores what you write only to sync it, and never reads, searches, logs, or analyzes it.
- When something breaks, the app sends a short error report: the error's name, its message and stack with any quoted text removed, the page's route, the build, and a rough browser name, such as "Chrome 141, macOS". Reports are built to leave out anything you wrote: no input, no page text, and nothing from the jar.
- End-to-end encryption isn't built yet. It comes before Threefold is shared, and until then the app claims no more privacy than it has.

## Run it

You need:

- **Node 24.** It's pinned in `.nvmrc`, so `nvm use` picks it.
- **pnpm 10 or later.** `package.json` pins pnpm 11.27.1, and pnpm switches to that version by itself.

```bash
pnpm install
pnpm dev-vars
pnpm db:migrate
pnpm dev
```

The app runs at http://localhost:3000.

- `pnpm dev-vars` writes `.dev.vars`, the Worker's local settings, with a new `BETTER_AUTH_SECRET`. Git ignores it, and it's needed for the tests too.
- `pnpm db:migrate` applies the database migrations to the local D1. Run it again after pulling a new migration.

The stories and the end-to-end tests run in real browsers. Before running them the first time, install Playwright's Chromium and WebKit, the iPhone's engine:

```bash
pnpm exec playwright install chromium webkit
```

## Scripts

| Script                       | What it does                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`                   | Runs the app at localhost:3000, with its server in the Workers runtime and a local D1 database                                                                                                   |
| `pnpm build`                 | Builds the app: the static files, including the shell `_shell.html`, in `dist/client`, and the Worker in `dist/server`                                                                           |
| `pnpm storybook`             | Runs the design system's Storybook, a site that shows each component on its own, at localhost:6006                                                                                               |
| `pnpm build-storybook`       | Builds the Storybook as a static site                                                                                                                                                            |
| `pnpm test`                  | Builds, then runs the tests: the jar's rules and the honest-wording check in Node, the built Worker in the Workers runtime, and every story in Chromium, where an accessibility problem fails it |
| `pnpm test:watch`            | Reruns the tests as files change. Run `pnpm build` first, for the Worker's tests                                                                                                                 |
| `pnpm e2e`                   | Builds, applies the migrations to the local D1, then runs the end-to-end tests against the Worker, in Chromium, in WebKit on an iPhone-sized screen, and with reduced motion                     |
| `pnpm dev-vars`              | Writes `.dev.vars` from `.dev.vars.example`, with a new `BETTER_AUTH_SECRET`. It leaves an existing `.dev.vars` alone                                                                            |
| `pnpm db:migrate`            | Applies the migrations in `migrations/` to the local D1                                                                                                                                          |
| `pnpm auth:migration`        | Writes Better Auth's tables as the next migration, after an upgrade or a change to its options. Review the SQL, and add its columns to the schema allowlist                                      |
| `pnpm lint`                  | Lints with oxlint, including rules that use TypeScript's types                                                                                                                                   |
| `pnpm format`                | Fixes what oxlint can, then formats with oxfmt                                                                                                                                                   |
| `pnpm check`                 | Checks the formatting without changing any file                                                                                                                                                  |
| `pnpm typecheck`             | Type-checks with TypeScript 7                                                                                                                                                                    |
| `pnpm cf-typegen`            | Regenerates `worker-configuration.d.ts`, the Worker's types, after a change to `wrangler.jsonc`. Run `pnpm dev-vars` first, so the secret's name is in them                                      |
| `pnpm run deploy`            | Builds, then runs `pnpm run release` by hand. Normally Workers Builds deploys on merge to `main`                                                                                                 |
| `pnpm run release`           | Applies the migrations to the production database, then deploys the built Worker. Workers Builds runs it on `main`                                                                               |
| `pnpm run release:preview`   | Applies the migrations to the previews' database, then deploys a Worker Preview. Workers Builds runs it on other branches                                                                        |
| `pnpm run release:storybook` | Deploys the built Storybook to its own Worker; `release:storybook:preview` makes a preview of it. The Storybook's Workers Builds connection runs them                                            |

## Commits and pull requests

- **Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/),** such as `fix: keep the jar's lid on`. After `pnpm install`, a `commit-msg` hook checks each one with commitlint.
- **No commit credits an AI agent.** The hook rejects `Co-authored-by` trailers, `Claude-Session` links, and "Generated with" lines that name an AI tool.
- **`main` only changes through pull requests,** which merge by squashing. The PR's title becomes the commit on `main`, so it follows the same format.
- **Every pull request runs CI:** lint, the format check, the typecheck, both builds, the tests, and the end-to-end tests, plus a check of the PR's commits, title, and body. They all have to pass before it merges.

## Where things are

- `src/`: the app. `src/components/` is the design system, which never imports the rest of the app.
- `src/lib/auth/`: accounts with Better Auth, passkeys only. `migrations/` holds the D1 migrations, starting with Better Auth's tables.
- `scripts/`: small Node scripts behind `pnpm dev-vars` and `pnpm auth:migration`.
- `.storybook/`: the Storybook's config, with a Vite config of its own.
- `docs/`: the PRD, the system design, the decision records in `docs/adr/`, and the design system's draft spec in `docs/design-system/`, which shrinks as components land in the Storybook.
- `AGENTS.md`: guidance for coding agents.

## License

[MIT](LICENSE)
