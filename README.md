# Threefold

A phone-first web app for a gratitude journal, built as a small daily ritual. Each day asks for three lines about one of eight categories, and each line folds into a paper star that drops into this month's jar.

Threefold is being set up: tooling, checks, and deploys come before product code. [The PRD](docs/PRD.md) describes the product, and [the system design](docs/SYSTEM_DESIGN.md) describes how it's built.

## Privacy, honestly

- What you write is saved on your device first, so the app is instant and works offline.
- Keeping your jar with a passkey syncs it across your devices through Threefold's server. The server stores what you write only to sync it, and never reads, searches, logs, or analyzes it.
- End-to-end encryption isn't built yet. It comes before Threefold is shared, and until then the app claims no more privacy than it has.

## Run it

You need:

- **Node 24.** It's pinned in `.nvmrc`, so `nvm use` picks it.
- **pnpm 10 or later.** `package.json` pins pnpm 11.27.1, and pnpm switches to that version by itself.

```bash
pnpm install
pnpm dev
```

The app runs at http://localhost:3000.

The tests run the design system's stories in a real browser. Before running them the first time, install Playwright's Chromium:

```bash
pnpm exec playwright install chromium
```

## Scripts

| Script                 | What it does                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm dev`             | Runs the app at localhost:3000                                                                     |
| `pnpm build`           | Builds the app: one static page, `_shell.html`, plus JavaScript and CSS files                      |
| `pnpm storybook`       | Runs the design system's Storybook, a site that shows each component on its own, at localhost:6006 |
| `pnpm build-storybook` | Builds the Storybook as a static site                                                              |
| `pnpm test`            | Runs the tests. Every story is a test, and an accessibility problem fails it                       |
| `pnpm lint`            | Lints with oxlint, including rules that use TypeScript's types                                     |
| `pnpm format`          | Fixes what oxlint can, then formats with oxfmt                                                     |
| `pnpm check`           | Checks the formatting without changing any file                                                    |
| `pnpm typecheck`       | Type-checks with TypeScript 7                                                                      |

## Where things are

- `src/`: the app. `src/components/` is the design system, which never imports the rest of the app.
- `.storybook/`: the Storybook's config, with a Vite config of its own.
- `docs/`: the PRD, the system design, the decision records in `docs/adr/`, and the design system's draft spec in `docs/design-system/`, which shrinks as components land in the Storybook.
- `AGENTS.md`: guidance for coding agents.

## License

[MIT](LICENSE)
