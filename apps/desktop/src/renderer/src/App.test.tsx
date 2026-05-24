import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App onboarding', () => {
  it('renders first-run onboarding before the app shell by default', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('Thesis Investing');
    expect(html).toContain('Build a repeatable thesis workflow.');
    expect(html).toContain('Continue');
  });
});
