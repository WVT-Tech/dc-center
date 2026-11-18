import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { registerApiRoutes } from './server/api.ts';
import { d1Client } from './server/d1.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  registerApiRoutes(app);

  const distDir = path.resolve(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const useViteDev =
    process.env.NODE_ENV === 'development' ||
    (!fs.existsSync(distIndex) && process.env.NODE_ENV !== 'production');

  if (useViteDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(distIndex);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const mode = d1Client.isCloudflareConfigured() ? 'Cloudflare D1 Remote' : 'Local SQLite (D1 Schema)';
    console.log(`DCC Server listening on http://0.0.0.0:${PORT} [DB: ${mode}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DCC server:', err);
  process.exit(1);
});
