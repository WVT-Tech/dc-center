import express from 'express';
import type { Express } from 'express';
import { d1Client, SCHEMA_SQL } from './d1.ts';
import type { DccPersistedPayload } from './d1.ts';

export function registerApiRoutes(app: Express): void {
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/d1/status', async (_req, res) => {
    try {
      const dbInfo = await d1Client.getStatus();
      res.json({ ok: dbInfo.connected, dbInfo });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to query D1 status';
      res.status(500).json({ ok: false, error: message });
    }
  });

  app.get('/api/d1/schema', (_req, res) => {
    res.type('text/plain').send(SCHEMA_SQL);
  });

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
}
