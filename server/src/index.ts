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
import { createHermesBridgeRouter } from './routes/hermes-bridge.js';
import { createOuLineDropAlertRouter } from './routes/ou-line-drop-alert.js';
import { createMatchV2Router } from './routes/match-v2.js';
import { createTelegramRouter } from './routes/telegram.js';
import { TelegramSender } from './notification-service/telegram-sender.js';
import { restoreTelegramBindings } from './data/telegram-persistence.js';
import { initLiteTelegramBot } from './telegram/lite-bot.js';
import { rateLimit } from './middleware/rate-limit.js';
import { loadRagStore, ragStats } from './goal-predict/rag-store.js';
import { matchV2Registry } from './match-v2/registry.js';

export { logger } from './logger.js';

const app = express();

const corsOrigins = config.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '4mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: 'v3-lite',
    telegram: config.telegram.enabled && config.features.telegramBot,
    ragLoaded: ragStats().loaded,
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

/** Railway / health check — root không phải frontend, chỉ thông báo API. */
app.get('/', (_req, res) => {
  res.json({
    service: 'Pro Football Analytics v3 — AI server',
    status: 'ok',
    health: '/api/health',
    hint: 'Frontend deploy trên Vercel. Server này chỉ phục vụ /api/*.',
  });
});

const telegramSender = new TelegramSender();
restoreTelegramBindings(telegramSender);
initLiteTelegramBot(telegramSender);

app.use('/api/b365-proxy', createB365ProxyRouter());
app.use('/api/auth', createB365AuthRouter());
app.use('/api/', rateLimit());

app.use('/api/ai/predict-goal', similarMatchesRouter);
app.use('/api/history', createHistorySaveRouter());
app.use('/api/hermes', createHermesBridgeRouter());
app.use('/api/telegram', createTelegramRouter(telegramSender));
app.use('/api/alerts', createOuLineDropAlertRouter(telegramSender));
if (config.matchV2.enabled) {
  app.use('/api/match-v2', createMatchV2Router());
}

app.listen(config.port, () => {
  logger.info(`Pro Football AI server v3 (lite) on port ${config.port}`);
  logger.info(`RAG dataset: ${config.goalPredict.datasetPath}`);
  logger.info(`RAG History: ${config.goalPredict.historyDir}`);
  if (config.matchV2.enabled) {
    logger.info(
      `Match v2 capture: ${matchV2Registry.root} (poll ${config.matchV2.pollIntervalMs}ms)`,
    );
  }
  logger.info(
    `OU line-drop alert: Tài ≤ ${config.alerts.ouLineDropPriceMax} (1_3/1_6 hạ line)`,
  );
  void loadRagStore(config.goalPredict.datasetPath, {
    metaPath: config.goalPredict.datasetMetaPath,
    historyDir: config.goalPredict.historyDir,
    datasetPath30Min: config.goalPredict.datasetPath30Min,
    halvesDatasetPath: config.goalPredict.halvesDatasetPath,
  }).catch((e) => logger.warn(`RAG store load failed: ${(e as Error).message}`));
});

function shutdown(signal: string): void {
  logger.info(`${signal} received. Shutting down...`);
  void matchV2Registry.stopAll().finally(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, telegramSender };
