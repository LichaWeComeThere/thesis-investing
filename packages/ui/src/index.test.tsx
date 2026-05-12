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
    expect(tokens.colors.background).toBe('#eef3f6');
    expect(tokens.radii.md).toBe(8);
    expect(themeCssVariables).toHaveProperty(
      '--ti-color-background',
      tokens.colors.background
    );
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
