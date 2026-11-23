import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const backendOrigin = process.env.BIGCITY_BACKEND_ORIGIN || 'http://127.0.0.1:8080';

export default defineConfig({
  root: fileURLToPath(new URL('./src/', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public/', import.meta.url)),
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: backendOrigin,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (request, incoming) => {
            if (incoming.headers.origin) request.setHeader('Origin', backendOrigin);
          });
        },
      },
    },
  },
  plugins: [{
    name: 'bigcity-development',
    transformIndexHtml(html) {
      return html.replace('src="app.js"', 'src="/app.ts"');
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname;
        if (pathname.startsWith('/assets/')) {
          request.url = request.url.replace('/assets/', '/');
          next();
          return;
        }
        if (!/^\/data\/(site|news|rules)\.json$/.test(pathname)) {
          next();
          return;
        }
        try {
          const file = new URL(`../backend${pathname}`, import.meta.url);
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(await readFile(file));
        } catch (error) {
          next(error);
        }
      });
    },
  }],
});
