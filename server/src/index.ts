import './load-env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { logger } from './logger.js';
import { createB365ProxyRouter } from './routes/b365-proxy.js';
import { createB365AuthRouter } from './routes/b365-auth.js';
import { similarMatchesRouter } from './routes/similar-matches.js';
import { createHistorySaveRouter } from './routes/history-save.js';
import { rateLimit } from './middleware/rate-limit.js';
import { loadRagStore, ragStats } from './goal-predict/rag-store.js';

export { logger } from './logger.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '4mb' }));

app.use('/api/b365-proxy', createB365ProxyRouter());
app.use('/api/auth', createB365AuthRouter());
app.use('/api/', rateLimit());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: 'v3-lite',
    ragLoaded: ragStats().loaded,
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

app.use('/api/ai/predict-goal', similarMatchesRouter);
app.use('/api/history', createHistorySaveRouter());

app.listen(config.port, () => {
  logger.info(`Pro Football AI server v3 (lite) on port ${config.port}`);
  void loadRagStore(config.goalPredict.datasetPath, {
    metaPath: config.goalPredict.datasetMetaPath,
    historyDir: config.goalPredict.historyDir,
    datasetPath30Min: config.goalPredict.datasetPath30Min,
  }).catch((e) => logger.warn(`RAG store load failed: ${(e as Error).message}`));
});

function shutdown(signal: string): void {
  logger.info(`${signal} received. Shutting down...`);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
