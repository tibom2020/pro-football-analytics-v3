export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  b365: {
    proxyUrl: process.env.B365_PROXY_URL || '',
    apiToken: process.env.B365_API_TOKEN || '',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
    enabled: !!process.env.TELEGRAM_BOT_TOKEN,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    enabled: !!process.env.OPENAI_API_KEY,
  },

  ollama: {
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen2.5:14b-instruct-q4_K_M',
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS || '30000', 10),
  },

  goalPredict: {
    // Relative to server's CWD (process.cwd() = repo-root/server when chạy `npm run dev`).
    modelPath: process.env.GOAL_MODEL_PATH || 'models/goal-imminent-v1.onnx',
    metaPath: process.env.GOAL_MODEL_META_PATH || 'models/goal-imminent-v1.meta.json',
    modelPath5Min: process.env.GOAL_MODEL_PATH_5MIN || 'models/goal-imminent-5min-v1.onnx',
    metaPath5Min: process.env.GOAL_MODEL_META_PATH_5MIN || 'models/goal-imminent-5min-v1.meta.json',
    modelPath30Min: process.env.GOAL_MODEL_PATH_30MIN || 'models/goal-imminent-30min-v1.onnx',
    metaPath30Min: process.env.GOAL_MODEL_META_PATH_30MIN || 'models/goal-imminent-30min-v1.meta.json',
    datasetPath: process.env.GOAL_DATASET_PATH || '../data/goal-dataset.jsonl',
    /** Dataset 30' — chỉ dùng để tra nhãn "30p sau có bàn?" cho tình huống tương tự (popup Chi tiết). */
    datasetPath30Min: process.env.GOAL_DATASET_PATH_30MIN || '../data/goal-dataset-30min.jsonl',
    /** Meta dataset (perMatch: matchId → file/ftStatus) — dùng để hiển thị "Chi tiết" tình huống tương tự. */
    datasetMetaPath: process.env.GOAL_DATASET_META_PATH || '../data/goal-dataset-meta.json',
    /** Thư mục History/*.md — đọc lazy để lấy giải + tỷ số chung cuộc cho popup chi tiết. */
    historyDir: process.env.GOAL_HISTORY_DIR || '../History',
    enableLLM: process.env.GOAL_PREDICT_ENABLE_LLM !== 'false',
    /** Model DeepSeek cho /predict-goal/reason (OpenAI-compatible API). */
    deepseekModel: process.env.GOAL_PREDICT_DEEPSEEK_MODEL || 'deepseek-v4-flash',
  },

  alerts: {
    oddsDropThreshold: parseFloat(process.env.ODDS_DROP_THRESHOLD || '0.15'),
    oddsDropWindowMinutes: parseInt(process.env.ODDS_DROP_WINDOW_MINUTES || '5', 10),
    pollIntervalMs: parseInt(process.env.ODDS_POLL_INTERVAL_MS || '30000', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30', 10),
  },

  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
    tabName: process.env.GOOGLE_SHEETS_TAB_NAME || 'Bets',
    goalTabName: process.env.GOOGLE_SHEETS_GOAL_TAB_NAME || 'GoalPredictions',
    goalSummaryTabName: process.env.GOOGLE_SHEETS_GOAL_SUMMARY_TAB_NAME || 'GoalPredictSummary',
    goalLevelSummaryTabName:
      process.env.GOOGLE_SHEETS_GOAL_LEVEL_TAB_NAME || 'GoalPredictByDuDoan',
    goalSummary30TabName:
      process.env.GOOGLE_SHEETS_GOAL_SUMMARY_30_TAB_NAME || 'GoalPredictSummary30',
    goalLevelSummary30TabName:
      process.env.GOOGLE_SHEETS_GOAL_LEVEL_30_TAB_NAME || 'GoalPredictByDuDoan30',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    /** PEM content (đã thay `\n` bằng newline thật trong code khi load). */
    serviceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
    /** Path tới file JSON nếu không dùng email/key trực tiếp. */
    serviceAccountJsonPath: process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH || '',
    enabled:
      !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      (!!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH ||
        (!!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)),
  },

  features: {
    aiEvaluation: process.env.FEATURE_AI_EVALUATION !== 'false',
    oddsMonitor: process.env.FEATURE_ODDS_MONITOR !== 'false',
    telegramBot: process.env.FEATURE_TELEGRAM_BOT !== 'false',
    chatAssistant: process.env.FEATURE_CHAT_ASSISTANT !== 'false',
    sheetsLogging: process.env.FEATURE_SHEETS_LOGGING !== 'false',
    liveAgent: process.env.FEATURE_LIVE_AGENT !== 'false',
  },

  /** Single-user live betting agents (GPT / Gemini / Deepseek) — PAPER mặc định. */
  agent: {
    controlToken: process.env.AGENT_CONTROL_TOKEN || '',
    defaultStakeVnd: parseInt(process.env.AGENT_DEFAULT_STAKE_VND || '500000', 10),
    maxOrdersPerMatch: parseInt(process.env.AGENT_MAX_ORDERS_PER_MATCH || '3', 10),
    cooldownMs: parseInt(process.env.AGENT_COOLDOWN_MS || '120000', 10),
    maxStakeVnd: parseInt(process.env.AGENT_MAX_STAKE_VND || '5000000', 10),
    liveExecution: process.env.AGENT_LIVE_EXECUTION === 'true',
    defaultUserId: process.env.AGENT_USER_ID || '',
    gptModel: process.env.AGENT_GPT_MODEL || 'gpt-4o-mini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.AGENT_GEMINI_MODEL || 'gemini-2.0-flash',
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
    deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    deepseekModel: process.env.AGENT_DEEPSEEK_MODEL || 'deepseek-chat',
    /** Khoảng tối thiểu giữa hai lần gọi LLM cùng trận (push kèo, không phải alert). */
    oddsPushEvalMinMs: parseInt(process.env.AGENT_ODDS_PUSH_EVAL_MIN_MS || '180000', 10),

    /** Cơ chế ra quyết định: 'independent' (3 agent độc lập, default) hoặc 'debate' (sidecar tổng hợp). */
    decisionMode: (process.env.AGENT_DECISION_MODE === 'debate' ? 'debate' : 'independent'),
    debateSidecarUrl: process.env.AGENT_DEBATE_SIDECAR_URL || 'http://127.0.0.1:8088',
    debateTimeoutMs: parseInt(process.env.AGENT_DEBATE_TIMEOUT_MS || '45000', 10),
    /** Khi debate fail → tự fallback về flow independent. Set 'false' để không fallback. */
    debateFallbackOnError: process.env.AGENT_DEBATE_FALLBACK_ON_ERROR !== 'false',
    debateModeratorModel: process.env.AGENT_DEBATE_MODERATOR_MODEL || 'gpt-4o-mini',
    debateConsensusStakeMult: parseFloat(process.env.AGENT_DEBATE_CONSENSUS_STAKE_MULT || '1.0'),
    debateRound2Enabled: process.env.AGENT_DEBATE_ROUND2_ENABLED !== 'false',
  },
} as const;
