import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'
import { defineConfig, loadEnv } from 'vite'
import { handleApiSubmit } from './server/apiBackend.ts'

const PROD_CSP_META = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'self' https://*.supabase.co blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const PROD_CSP_HEADER = `${PROD_CSP_META}; frame-ancestors 'self'`;

const DEV_CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* http://localhost:* ws://127.0.0.1:* http://127.0.0.1:*",
  "frame-src 'self' https://*.supabase.co blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

function applySecurityHeaders(res: ServerResponse, cspPolicy: string): void {
  res.setHeader('Content-Security-Policy', cspPolicy);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
}

function attachApiMiddleware(
  middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void },
  isDev: boolean
): void {
  const cspPolicy = isDev ? DEV_CSP_HEADER : PROD_CSP_HEADER;

  middlewares.use(async (req, res, next) => {
    applySecurityHeaders(res, cspPolicy);

    if (req.url === '/api/submit' && req.method === 'POST') {
      try {
        await handleApiSubmit(req, res);
      } catch {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal server error during submission.' }));
      }
    } else if (req.url === '/api/health') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    } else {
      next();
    }
  });
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: 'api-and-security-headers-plugin',
        transformIndexHtml(html, ctx) {
          if (ctx.server) return html;
          const cspTag = `<meta http-equiv="Content-Security-Policy" content="${PROD_CSP_META}" />`;
          return html.replace('<head>', `<head>\n    ${cspTag}`);
        },
        configureServer(server) {
          attachApiMiddleware(server.middlewares, true);
        },
        configurePreviewServer(server) {
          attachApiMiddleware(server.middlewares, false);
        },
      },
    ],
  };
});
