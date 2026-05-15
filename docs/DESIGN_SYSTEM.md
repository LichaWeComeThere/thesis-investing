# Design System

The `packages/ui` workspace contains reusable visual foundations for the Thesis Investing desktop app. It is intentionally small in Phase 1, Stage 2 so later stages can build real workflows without copying visual decisions into every screen.

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
- `tokens.radii`
- `tokens.typography`
- `tokens.shadows`

The package also exports `themeCssVariables`, which maps core tokens to CSS custom properties for app-level layout styles.

## Components

- `Button`: reusable button foundation with primary, secondary, ghost, and sidebar variants.
- `Badge`: compact status label for non-interactive state.
- `Card`: reusable content container with optional title, eyebrow, and footer.
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
