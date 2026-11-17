import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { d1Client } from './server/d1.ts';
import type { DccPersistedPayload } from './server/d1.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health & Database Connection Status
  app.get('/api/d1/status', async (_req, res) => {
    try {
      const dbInfo = await d1Client.getStatus();
      res.json({ ok: dbInfo.connected, dbInfo });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to query D1 status';
      res.status(500).json({ ok: false, error: message });
    }
  });

  // Download or inspect D1 SQL Schema
  app.get('/api/d1/schema', (_req, res) => {
    try {
      const schemaPath = path.resolve(__dirname, 'd1/schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      res.type('text/plain').send(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Schema file not found';
      res.status(500).json({ ok: false, error: message });
    }
  });

  // Read full DCC state from Cloudflare D1 (or local D1-compatible SQLite)
  app.get('/api/dcc/state', async (_req, res) => {
    try {
      const state = await d1Client.readState();
      const dbInfo = await d1Client.getStatus();
      if (!state) {
        res.json({ ok: true, empty: true, state: null, dbInfo });
        return;
      }
      res.json({ ok: true, empty: false, state, dbInfo });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load state from D1';
      res.status(500).json({ ok: false, error: message });
    }
  });

  // Initialize Schema & Sync full state into Cloudflare D1
  app.post('/api/dcc/sync', async (req, res) => {
    try {
      const body = req.body as {
        state?: DccPersistedPayload;
        replaceAll?: boolean;
      };
      if (!body || !body.state) {
        res.status(400).json({ ok: false, error: 'Missing state payload' });
        return;
      }
      await d1Client.syncState(body.state, { replaceAll: Boolean(body.replaceAll) });
      const dbInfo = await d1Client.getStatus();
      res.json({ ok: true, dbInfo });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync state to D1';
      res.status(500).json({ ok: false, error: message });
    }
  });

  // Explicit schema initialization + test endpoint
  app.post('/api/d1/init', async (req, res) => {
    try {
      await d1Client.ensureSchema(true);
      const body = req.body as { state?: DccPersistedPayload } | undefined;
      if (body?.state) {
        await d1Client.syncState(body.state, { replaceAll: false });
      }
      const dbInfo = await d1Client.getStatus();
      res.json({ ok: dbInfo.connected, dbInfo });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize D1 schema';
      res.status(500).json({ ok: false, error: message });
    }
  });

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
