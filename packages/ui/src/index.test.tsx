import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  themeCssVariables,
  tokens
} from './index';

describe('@thesis-investing/ui', () => {
  it('exports design tokens and theme variables', () => {
    expect(tokens.colors.background).toBe('#F6F5F1');
    expect(tokens.radii.bento).toBe(10);
    expect(themeCssVariables).toHaveProperty(
      '--ti-color-background',
      tokens.colors.background
    );
    expect(themeCssVariables).toHaveProperty(
      '--ti-radius-bento',
      `${tokens.radii.bento}px`
    );
  });

  it('keeps normal text readable on the research workspace surfaces', () => {
    const surfaces = [
      tokens.colors.background,
      tokens.colors.surface,
      tokens.colors.surfaceMuted,
      tokens.colors.surfaceSoft,
      tokens.colors.sidebar
    ];
    const textColors = [
      tokens.colors.text,
      tokens.colors.textMuted,
      tokens.colors.textSubtle
    ];

    for (const foreground of textColors) {
      for (const background of surfaces) {
        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
      }
    }

    expect(
      contrastRatio(tokens.colors.calloutWarningText, tokens.colors.calloutWarningBg)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(tokens.colors.onPrimary, tokens.colors.primary)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(tokens.colors.onPrimary, tokens.colors.primaryHover)
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps focus indicators and input boundaries distinguishable', () => {
    expect(
      contrastRatio(tokens.colors.focus, tokens.colors.background)
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrastRatio(tokens.colors.borderStrong, tokens.colors.surface)
    ).toBeGreaterThanOrEqual(3);
  });

  it('renders a reusable Button', () => {
    const html = renderToStaticMarkup(
      <Button variant="secondary">Open view</Button>
    );

    expect(html).toContain('<button');
    expect(html).toContain('Open view');
  });

  it('renders a reusable Badge', () => {
    const html = renderToStaticMarkup(
      <Badge variant="accent">Not built yet</Badge>
    );

    expect(html).toContain('<span');
    expect(html).toContain('Not built yet');
  });

  it('renders a Card with a title and content', () => {
    const html = renderToStaticMarkup(
      <Card title="Planned workspace">Placeholder content</Card>
    );

    expect(html).toContain('Planned workspace');
    expect(html).toContain('Placeholder content');
  });

  it('renders a PageHeader with title and description', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        description="Future offline MVP screen."
        title="Dashboard"
      />
    );

    expect(html).toContain('Dashboard');
    expect(html).toContain('Future offline MVP screen.');
  });
});

function contrastRatio(foreground: string, background: string): number {
  const luminance = (color: string): number => {
    const channels = [1, 3, 5].map((offset) => {
      const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
}
