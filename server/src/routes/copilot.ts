import { Router } from 'express';
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNodeExpressEndpoint } from '@copilotkit/runtime';
import { config } from '../config.js';
import OpenAI from 'openai';

export function createCopilotRouter() {
  const openai = new OpenAI({ apiKey: config.openai.apiKey });
  const copilotRuntime = new CopilotRuntime();

  // Tạo handler cho CopilotKit
  return copilotRuntimeNodeExpressEndpoint({
    endpoint: '/api/copilotkit',
    runtime: copilotRuntime,
    serviceAdapter: new OpenAIAdapter({ openai }),
  });
}
