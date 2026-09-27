---
status: accepted
---

# UI primitives: shadcn/ui on Base UI

**Context:** the design system restyles accessible building blocks, like buttons, dialogs, sheets, and sliders, instead of building them from scratch. shadcn/ui offers them on two libraries, Radix and Base UI.

**Decision:** we use shadcn/ui on Base UI (`shadcn init -b base`, the `base-nova` style).

**Why:** the draft design spec was written for Radix. But the drawer under shadcn's Radix version, Vaul, is unmaintained, while shadcn's Base UI version builds its drawer on Base UI's own.

## Consequences

- **The draft's sketches get rewritten.** They use Radix's `asChild` prop and `data-state` attributes. The draft cleanup moves them to Base UI's `render` prop, which lets a component render as another element, and to Base UI's own data attributes. The BottomSheet moves off Vaul, onto Base UI's Drawer.
- **Links come in as elements.**
  - The screens create them. Components render them with Base UI's `useRender`, the hook behind `render`, styled with `buttonVariants()` when they should look like buttons.
  - That keeps the design system free of TanStack Router, as its lint rule requires (system design §2.3).
  - A link never goes through Button, which would announce it as a button (Base UI's Button docs).
- **Nothing is missing.** Every component the design needs exists in shadcn's Base UI registry (checked in shadcn 4.21.0).
