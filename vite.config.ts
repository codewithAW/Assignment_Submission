import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { handleApiSubmit } from './server/apiBackend.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: 'api-backend-plugin',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/submit' && req.method === 'POST') {
              try {
                await handleApiSubmit(req, res);
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Server error' }));
              }
            } else if (req.url === '/api/health') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
            } else {
              next();
            }
          });
        },
        configurePreviewServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/submit' && req.method === 'POST') {
              try {
                await handleApiSubmit(req, res);
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Server error' }));
              }
            } else if (req.url === '/api/health') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
            } else {
              next();
            }
          });
        }
      }
    ],
  };
});
