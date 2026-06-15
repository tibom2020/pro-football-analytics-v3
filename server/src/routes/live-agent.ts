import { Router, Request, Response, NextFunction } from 'express';
import { LiveBetAgentRegistry } from '../live-agent/service.js';
import type { config as AppConfig } from '../config.js';
import type { AgentExecutionMode, AgentProvider } from '../live-agent/types.js';
import type { FlowBetType } from '../telegram/bet-flow.js';

type Config = typeof AppConfig;

const PROVIDERS: AgentProvider[] = ['gpt', 'gemini', 'deepseek'];

function isAgentProvider(s: string): s is AgentProvider {
  return PROVIDERS.includes(s as AgentProvider);
}

export function createLiveAgentRouter(registry: LiveBetAgentRegistry, cfg: Config): Router {
  const router = Router();

  const requireToken = (req: Request, res: Response, next: NextFunction): void => {
    if (!cfg.features.liveAgent) {
      res.status(503).json({ error: 'FEATURE_LIVE_AGENT tắt' });
      return;
    }
    const expected = cfg.agent.controlToken;
    if (!expected || expected.length < 8) {
      res.status(503).json({
        error:
          'AGENT_CONTROL_TOKEN chưa cấu hình hoặc quá ngắn (tối thiểu 8 ký tự). Thêm vào server/.env',
      });
      return;
    }
    const got = String(req.headers['x-agent-control-token'] || '');
    if (got !== expected) {
      res.status(401).json({ error: 'Unauthorized (thiếu/sai X-Agent-Control-Token)' });
      return;
    }
    next();
  };

  router.use(requireToken);

  router.get('/status', (req: Request, res: Response): void => {
    const matchId = req.query.matchId ? String(req.query.matchId) : undefined;
    res.json(registry.getStatus(matchId));
  });

  router.post('/emergency-stop', (_req: Request, res: Response): void => {
    registry.emergencyStop();
    res.json({ ok: true, ...registry.getStatus() });
  });

  router.post('/clear-emergency', (_req: Request, res: Response): void => {
    registry.clearEmergency();
    res.json({ ok: true, ...registry.getStatus() });
  });

  router.post('/config', (req: Request, res: Response): void => {
    const body = req.body as {
      userId?: string;
      stakeVnd?: number;
      maxOrdersPerMatch?: number;
      cooldownMs?: number;
      maxStakeVnd?: number;
      executionMode?: AgentExecutionMode;
      allowedBetTypes?: FlowBetType[];
      agents?: Partial<Record<AgentProvider, { enabled?: boolean }>>;
    };

    if (body.executionMode === 'live' && !cfg.agent.liveExecution) {
      res.status(400).json({
        error: 'Chế độ LIVE cần AGENT_LIVE_EXECUTION=true trên server (và tích hợp bookmaker).',
      });
      return;
    }

    registry.setShared({
      ...(body.userId !== undefined && { userId: body.userId }),
      ...(body.stakeVnd !== undefined && { stakeVnd: body.stakeVnd }),
      ...(body.maxOrdersPerMatch !== undefined && { maxOrdersPerMatch: body.maxOrdersPerMatch }),
      ...(body.cooldownMs !== undefined && { cooldownMs: body.cooldownMs }),
      ...(body.maxStakeVnd !== undefined && { maxStakeVnd: body.maxStakeVnd }),
      ...(body.executionMode !== undefined && { executionMode: body.executionMode }),
      ...(body.allowedBetTypes !== undefined && { allowedBetTypes: body.allowedBetTypes }),
    });

    if (body.agents) {
      for (const [k, v] of Object.entries(body.agents)) {
        if (!isAgentProvider(k) || v?.enabled === undefined) continue;
        registry.setProviderEnabled(k, v.enabled);
      }
    }

    res.json(registry.getStatus());
  });

  router.post('/agent/:provider/enable', (req: Request, res: Response): void => {
    const p = String(req.params.provider);
    if (!isAgentProvider(p)) {
      res.status(400).json({ error: 'provider phải là gpt | gemini | deepseek' });
      return;
    }
    const enabled = !!(req.body as { enabled?: boolean }).enabled;
    registry.setProviderEnabled(p, enabled);
    res.json(registry.getStatus());
  });

  router.post('/trigger', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { matchId?: string; userPrompt?: string };
    const matchId = body.matchId ? String(body.matchId) : '';
    if (!matchId) {
      res.status(400).json({ error: 'Thiếu matchId' });
      return;
    }
    const userPrompt =
      typeof body.userPrompt === 'string' && body.userPrompt.trim()
        ? body.userPrompt.trim().slice(0, 600)
        : undefined;
    await registry.triggerMatchAction(matchId, userPrompt);
    res.json({ ok: true, ...registry.getStatus(matchId) });
  });

  return router;
}
