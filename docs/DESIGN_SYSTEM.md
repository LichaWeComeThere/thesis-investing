# Design System

The `packages/ui` workspace contains reusable visual foundations for the Thesis Investing desktop app. It is intentionally small in Phase 1, Stage 2 so later stages can build real workflows without copying visual decisions into every screen.

## Visual direction (Phase 1)

The product reads as a **dark-first, premium fintech research terminal**: deep canvas (`background` / `backgroundDeep`), **app** and **card** surfaces (`surfaceMuted` → `surface` → `surfaceElevated`), **subtle borders** plus **teal active** rings, and calm type (`text` / `textMuted` / `textSubtle`). Semantic accents include **primary** teal, **growth**, **warning**, **risk**, and **data** blues—used sparingly for hierarchy and state, not decoration.

**Hybrid shell (terminal structure + bento polish):** keep the serious **left rail + workspace** layout, but lean on **large-radius bento cards** (`radii.bento`), **roomier card padding** (`spacing.card`), **layered depth** (soft shadows; teal **emphasis glow** only on primary result cards), and **consistent 150–250ms** motion so the UI reads as a modern finance SaaS surface rather than a flat admin grid.

## Purpose

- Keep shared React UI components in one package.
- Keep design tokens for color, spacing, radius, type, and shadow values in one place.
- Give the Windows-first desktop app consistent reusable building blocks.
- Avoid mixing product workflow logic into UI primitives.

## Design Tokens

Design tokens are exported from `@thesis-investing/ui` as `tokens`.

Available token groups:

- `tokens.colors`
- `tokens.spacing`
- `tokens.radii` — **sm** / **md** / **lg** for nested controls; **bento** for major cards; **pill** for buttons/badges.
- `tokens.typography` — type scale: **xs–sm** (12–14px) small controls; **md–lg** (16–18px) inputs and buttons; **xl** (24px) card titles; **xxl** (30px) large dashboard / page titles; **display** (28px) rail lockup. Matching `--ti-font-size-*` variables are on `themeCssVariables`.
- `tokens.shadows`

The package also exports `themeCssVariables`, which maps core tokens to CSS custom properties for app-level layout styles.

## Components

- `Button`: reusable button foundation with primary, secondary, ghost, and sidebar variants.
- `Badge`: compact status label for non-interactive state.
- `Card`: reusable content container with optional title, eyebrow, footer, and optional **`emphasis`** (soft teal glow for primary result / high-attention panels).
- `PageHeader`: reusable page heading area with optional eyebrow, description, badge, and actions.

## Basic Usage

```tsx
import { Badge, Button, Card, PageHeader } from '@thesis-investing/ui';

export function Example(): JSX.Element {
  return (
    <>
      <PageHeader
        badge={<Badge variant="accent">Not built yet</Badge>}
        description="Future offline MVP workspace."
        eyebrow="Phase 1"
        title="Dashboard"
      />

      <Card title="Planned workspace">
        <p>This area is reserved for a future screen.</p>
      </Card>

      <Button variant="secondary">Open view</Button>
    </>
  );
}
```

## Out Of Scope

- Full product workflows.
- Data visualization components.
- Form systems for scoring, portfolios, persistence, or settings.
- Live market data, sync, AI, brokerage, or trading features.
- A complete visual redesign of the desktop shell.
