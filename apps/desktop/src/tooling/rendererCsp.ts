import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

/** Keep packaged HTML strict; only the local Vite server gets HMR allowances. */
export function developmentRendererCsp(): Plugin {
  return {
    name: 'local-renderer-development-csp',
    apply: 'serve',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        // React's development refresh preamble is inline. Hash the exact emitted
        // bytes rather than enabling all inline scripts or eval in development.
        const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
          .filter((match) => !/\bsrc\s*=/i.test(match[1]) && match[2].trim())
          .map((match) => `'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
        const sockets = (context.server?.resolvedUrls?.local ?? []).flatMap((localUrl) => {
          const url = new URL(localUrl);
          if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return [];
          url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
          return [url.origin];
        });
        return html.replace(
          /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/i,
          (_match, prefix: string, policy: string, suffix: string) => prefix + policy
            .replace("script-src 'self'", ["script-src 'self'", ...hashes].join(' '))
            .replace("connect-src 'none'", ["connect-src 'self'", ...sockets].join(' ')) + suffix
        );
      }
    }
  };
}
