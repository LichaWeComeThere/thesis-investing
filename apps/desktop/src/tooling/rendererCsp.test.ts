import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { describe, expect, it } from 'vitest';
import { developmentRendererCsp } from './rendererCsp';

const rendererRoot = fileURLToPath(new URL('../renderer/', import.meta.url));
const readTemplate = () => readFile(new URL('../renderer/index.html', import.meta.url), 'utf8');
const policyFrom = (html: string) => html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/)?.[1] ?? '';

describe('renderer content policy', () => {
  it('shipped template allows local scripts and disallows connections, frames, forms, and eval', async () => {
    const policy = policyFrom(await readTemplate());
    for (const directive of ["default-src 'none'", "script-src 'self'", "connect-src 'none'", "frame-src 'none'", "object-src 'none'", "worker-src 'none'", "base-uri 'none'", "form-action 'none'"]) {
      expect(policy.split(';').map((item) => item.trim())).toContain(directive);
    }
    expect(policy).not.toContain('unsafe-eval');
    expect(policy.match(/script-src[^;]*/)?.[0]).not.toContain('unsafe-inline');
    expect(developmentRendererCsp().apply).toBe('serve');
  });

  it('hashes the actual React refresh preamble and only allows loopback HMR connections', async () => {
    const server = await createServer({
      configFile: false,
      root: rendererRoot,
      logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0 },
      plugins: [react(), developmentRendererCsp()]
    });
    try {
      await server.listen();
      const html = await server.transformIndexHtml('/', await readTemplate());
      const policy = policyFrom(html);
      const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
        .filter((match) => !/\bsrc\s*=/i.test(match[1]) && match[2].trim());
      expect(inlineScripts.length).toBeGreaterThan(0);
      expect(inlineScripts.some((match) => match[2].includes('@react-refresh'))).toBe(true);
      for (const script of inlineScripts) {
        expect(policy).toContain(`'sha256-${createHash('sha256').update(script[2]).digest('base64')}'`);
      }
      const developmentUrl = new URL(server.resolvedUrls!.local[0]);
      developmentUrl.protocol = 'ws:';
      expect(policy).toContain(`connect-src 'self' ${developmentUrl.origin}`);
      expect(policy).not.toContain('unsafe-eval');
      expect(policy.match(/script-src[^;]*/)?.[0]).not.toContain('unsafe-inline');
      expect(policy).not.toContain('https:');
    } finally {
      await server.close();
    }
  });
});
