# Threefold design system

Everything Threefold is made of, as React components on shadcn/ui (Base UI) and Tailwind v4, in a TanStack Start app. This folder is the spec:

- one file per component
- the foundations and the exact data
- reference images of every component in Day and Night

It mirrors the "Design system" page of the Threefold design canvas.

**It's a temporary build spec** (system design §2.9):

- The PR that lands a component's stories and docs page in Storybook also deletes that component's file here, so each component has one source of truth at a time.
- When the folder is empty, it goes, and the Storybook is the only documentation.
- Where this folder disagrees with `docs/SYSTEM_DESIGN.md` or `docs/PRD.md`, those two win.

## How it's built

- **Tokens** (`src/styles.css`, copied from `styles.css` here):
  - colors for Day (`:root`) and Night (`.dark`), on shadcn's names
  - the eight category inks
  - type, radius, and shadows
  - five springs, and the animations
  - three utilities: `squish`, `riso`, and `paper-grain`
- **Primitives** (`src/components/ui/*`): shadcn/ui on Base UI, restyled through their variants and classes, never forked. They're Button, Toggle, Kbd, Input, Switch, Toggle Group, Slider, Badge, Card, Carousel, Calendar, Drawer, Alert Dialog, Alert, Sonner, Field, and Label.
- **Threefold's own** (`src/components/threefold/*`): the paper objects, and the parts the screens are made of. PaperStar, Jar with JarLayer, PaperStrip, EntryLine, DayPrompt, SpreadCard, JarShelf, StarPanel, SandJar, AppHeader, AppNav, and the rest.
- **Screens** (`src/routes/*` and `src/screens/*`): Hello, Today, Review, Shake, Shelf, Insights, and Settings.
  - The tabbed screens are routes under one pathless layout.
  - Parts that only one screen uses go in `src/screens/`.
  - Screens are built only from the layers above. The live boards on the canvas are the reference.

Beside them, `src/lib/` holds the categories (the eight, and the cycle), `sound.ts` (`useSound`), `copy/*` (every sentence the app says), `sand.ts`, and `time.ts`. The app's other layers are in the system design's §2.3.

## Start

Setup (story 1 in the PRD) scaffolds the app. These are the parts that come from this folder:

```bash
pnpm dlx shadcn@latest init -t start -b base -p nova -n threefold --no-monorepo
pnpm dlx shadcn@latest add button toggle kbd input switch toggle-group slider badge card carousel calendar drawer alert-dialog alert sonner field label
pnpm add motion @fontsource-variable/figtree @fontsource-variable/kalnia @fontsource-variable/shantell-sans
pnpm remove next-themes
# -t start: TanStack Start · -b base: Base UI (ADR 0004) · -p nova: the base-nova style, which also skips the preset picker
```

Then:

- Replace `src/styles.css` with `styles.css` from this folder.
- Point `src/components/ui/sonner.tsx` at `useTheme` from `src/components/theme-provider.tsx`, which replaces `next-themes`.
- Remove the template's Geist font.
- Note that shadcn's calendar installs react-day-picker 10. The MonthCalendar sketch was written against 9.

## Where things go

```text
src/
  styles.css             tokens: Day, Night, categories, motion, utilities, fonts
  router.tsx             the router, from the template
  routes/
    __root.tsx           <html>, the stylesheet, ThemeProvider, MotionConfig
    _app.tsx             the shell: JarProvider · AppHeader · AppNav · JarLayer · Toaster
    _app/index.tsx       Today
    _app/review.tsx · shake.tsx · shelf.tsx · insights.tsx · settings.tsx
  screens/               parts only one screen uses: today/lines.tsx, settings/keys-card.tsx, …
  components/
    ui/                  shadcn/ui on Base UI, restyled
    threefold/           paper-star · jar · jar-layer · paper-strip · entry-line · …
    theme-provider.tsx   Day, Night, System, with no flash
  lib/
    categories.ts · sound.ts · copy/ · sand.ts · time.ts · utils.ts
```

## House rules

### Tokens, not hex

- Components use `bg-paper`, `text-ink-2`, and `bg-(--cat-light)`, never a hex. Night then comes for free.
- The one exception is ink that must not flip: `text-paper-ink`, on strips and star outlines.

### Keep shadcn's names

- Restyle through variants and classes. Keep `data-slot`, the `render` prop, and Base UI's behavior.
- Variant names stay shadcn's (`default`, `outline`…), so components that call `buttonVariants()` still match.

### Independent of the app

- Nothing in `src/components/` imports TanStack Router, TanStack Start, Dexie, or the app's data, sync, account, routes, or screens. A lint rule enforces it (system design §2.3).
- Links come in from the screens as elements. Components render them with Base UI's `useRender`, styled with `buttonVariants()` when they should look like buttons.
- A link never goes through Button, which would announce it as a button (Base UI's Button docs).
- Data comes in as props.

### One category per subtree

- `data-cat="talents"` sets `--cat`, `--cat-deep`, `--cat-light`, and `--cat-star` for everything inside.
- Name the category in words wherever its color appears.

### Reachable, readable

- Anything you can press is at least 44 × 44 px, every icon has words beside it, and everything shows the focus ring.
- Every gesture has a plain twin: shake has a button, and drag has arrows.

### Motion with a fallback

- Every movement names its spring, and says what happens with reduced motion, usually a fade.
- Nothing loops while reduced motion is on.

### Kind words

- No streaks, no "missed", and no red. Quiet days are plain paper.
- Sound is optional and never the only signal. Insights is silent.
- Say only what's true about privacy. Until end-to-end encryption ships, a test blocks "not even us", "a jar only you can open", and anything like them.

## Every component

| # | Component | Family | Built on | File | Spec |
|---|---|---|---|---|---|
| 01 | Color | Foundations | tokens | `src/styles.css · src/components/theme-provider.tsx` | [color.md](foundations/color.md) |
| 02 | Type & shape | Foundations | tokens | `src/styles.css · src/routes/__root.tsx` | [type-and-shape.md](foundations/type-and-shape.md) |
| 03 | Motion & sound | Foundations | tokens | `src/styles.css · src/lib/sound.ts` | [motion-and-sound.md](foundations/motion-and-sound.md) |
| 04 | Icon | Foundations | Threefold | `src/components/threefold/icon.tsx` | [icon.md](foundations/icon.md) |
| 05 | Button | Actions | shadcn · Button | `src/components/ui/button.tsx` | [button.md](components/actions/button.md) |
| 06 | Toggle | Actions | shadcn · Toggle | `src/components/ui/toggle.tsx` | [toggle.md](components/actions/toggle.md) |
| 07 | HoldButton | Actions | Threefold | `src/components/threefold/hold-button.tsx` | [hold-button.md](components/actions/hold-button.md) |
| 08 | Kbd | Actions | shadcn · Kbd | `src/components/ui/kbd.tsx` | [kbd.md](components/actions/kbd.md) |
| 09 | EntryLine | Inputs | Threefold | `src/components/threefold/entry-line.tsx` | [entry-line.md](components/inputs/entry-line.md) |
| 10 | Switch | Inputs | shadcn · Switch | `src/components/ui/switch.tsx` | [switch.md](components/inputs/switch.md) |
| 11 | Segmented | Inputs | shadcn · Toggle Group | `src/components/threefold/segmented.tsx` | [segmented-control.md](components/inputs/segmented-control.md) |
| 14 | Slider | Inputs | shadcn · Slider | `src/components/ui/slider.tsx` | [slider.md](components/inputs/slider.md) |
| 15 | PaperStar | Paper objects | Threefold | `src/components/threefold/paper-star.tsx` | [paper-star.md](components/paper-objects/paper-star.md) |
| 16 | Jar | Paper objects | Threefold | `src/components/threefold/jar.tsx` | [jar.md](components/paper-objects/jar.md) |
| 17 | PaperStrip | Paper objects | Threefold | `src/components/threefold/paper-strip.tsx` | [paper-strip.md](components/paper-objects/paper-strip.md) |
| 18 | CategoryTag | Today | shadcn · Badge | `src/components/threefold/category-tag.tsx` | [category-tag.md](components/today/category-tag.md) |
| 19 | DateHeading | Today | Threefold | `src/components/threefold/date-heading.tsx` | [date-heading.md](components/today/date-heading.md) |
| 20 | DayPrompt | Today | Threefold | `src/components/threefold/day-prompt.tsx` | [day-prompt.md](components/today/day-prompt.md) |
| 21 | DayStatus | Today | Threefold | `src/components/threefold/day-status.tsx` | [day-status.md](components/today/day-status.md) |
| 22 | WeekTally | Review | Threefold | `src/components/threefold/week-tally.tsx` | [week-tally.md](components/review/week-tally.md) |
| 23 | SpreadCard | Review | Base UI · Button | `src/components/threefold/spread-card.tsx` | [spread-card.md](components/review/spread-card.md) |
| 24 | WritingCard | Review | shadcn · Card | `src/components/threefold/writing-card.tsx` | [writing-card.md](components/review/writing-card.md) |
| 25 | JarShelf | Shelf and Shake | shadcn · Carousel | `src/components/threefold/jar-shelf.tsx` | [jar-shelf.md](components/shelf-and-shake/jar-shelf.md) |
| 26 | MonthCalendar | Shelf and Shake | shadcn · Calendar | `src/components/threefold/month-calendar.tsx` | [month-calendar.md](components/shelf-and-shake/month-calendar.md) |
| 27 | StarPanel | Shelf and Shake | Threefold | `src/components/threefold/star-panel.tsx` | [star-panel.md](components/shelf-and-shake/star-panel.md) |
| 28 | MemoryCard | Shelf and Shake | shadcn · Card | `src/components/threefold/memory-card.tsx` | [memory-card.md](components/shelf-and-shake/memory-card.md) |
| 29 | StatTile | Insights | Threefold | `src/components/threefold/stat-tile.tsx` | [stat-tile.md](components/insights/stat-tile.md) |
| 30 | Callout | Insights | shadcn · Alert | `src/components/threefold/callout.tsx` | [callout.md](components/insights/callout.md) |
| 32 | SandJar | Insights | Threefold | `src/components/threefold/sand-jar.tsx` | [sand-jar.md](components/insights/sand-jar.md) |
| 33 | BottomSheet | Overlays | shadcn · Drawer | `src/components/threefold/bottom-sheet.tsx` | [bottom-sheet.md](components/overlays/bottom-sheet.md) |
| 34 | ConfirmDialog | Overlays | shadcn · Alert Dialog | `src/screens/settings/empty-jar-dialog.tsx` | [confirm-dialog.md](components/overlays/confirm-dialog.md) |
| 35 | Toast | Overlays | shadcn · Sonner | `src/components/ui/sonner.tsx` | [toast.md](components/overlays/toast.md) |
| 38 | AppHeader | Shell | Threefold | `src/components/threefold/app-header.tsx` | [app-header.md](components/shell/app-header.md) |
| 39 | AppNav | Shell | Threefold | `src/components/threefold/app-nav.tsx` | [app-nav.md](components/shell/app-nav.md) |
| 40 | SettingsCard | Shell | shadcn · Card + Field | `src/components/threefold/settings-card.tsx` | [settings-card.md](components/shell/settings-card.md) |

Five numbers are missing: 12, 13, 31, 36, and 37. They were TimeChips, TimeStepper, NameBars, NudgeBanner, and PrivacyLock, which belong to deferred features, and their files are gone. The other numbers stay as they were.

## Data

- **`data/categories.json`:** the eight categories, and the cycle. Each category has its name, inks (Day and Night), prompt, placeholders, and quips.
- **`data/icons.json`:** the 39 hand-drawn icons, as path data on a 24 px grid.
- **`data/star.json`:** the paper star's paths and stroke rules.
- **`data/jar.json`:** the jar's geometry: the glass, highlights, rim, cork, tape label, shadow, and night light.
- **`data/springs.json`:** the five springs: k, c, settle, and the CSS `linear()` curve.
- **`data/motion.json`:** the motion spec, with timelines, easing, and reduced-motion behavior.
- **`data/sound.json`:** the key, the sound palette, every sound event, and the rules.
- **`data/copy.json`:** the words for Today's status lines, Review, Shelf, Shake, Insights, Settings, the account flows, and the toasts.

## Reference images

- **In `img/`:** the component images, in Day and Night.
- **In `screens/`:** prototype screens for context: phone Today, Review, Shake, Shelf, Insights, and Settings, plus tablet and desktop Today.

Both predate this cleanup, so a few things in them have changed. Where an image and the words disagree, the words win:

- Settings, and SettingsCard's image, show the Daily nudge card, which is deferred.
- DayStatus's image shows the "Nudge set for…" line, and Toast's and BottomSheet's images show nudge toasts and the nudge question. All of them are gone.
- Insights, and StatTile's image, show "days running" and its note, where "jars on the shelf" goes now.
- Dates and month labels use UK formats, like "23 September", and "SEPT" on the jar's tape. The spec uses US formats.

## Still open

These wait on the PRD's "Decisions to confirm in review", so the copy keeps the draft's words for now:

- **What "kept" means:** "{Weekday}'s folded and kept", the review's "kept" stamp, "All eight. Kept.", and "The jar kept your place".
- **Honest privacy wording:**
  - the hello screen's lead, "in a jar only you can open"
  - "locked" after signing out, and "Unlocked" when a jar opens
  - "no one can bring them back" and "go for good", in the delete and empty dialogs
- **Bonus rounds:** rounds 5 to 8 need done headlines, if the eight-round cap is accepted. A bonus round's folding lines shouldn't promise that the lid pops, because the lid pops only once a day. Both need new copy.
