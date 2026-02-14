import * as anthropicAdapter from "./providers/anthropic";
import * as openaiAdapter from "./providers/openai";
import * as googleAdapter from "./providers/google";
import * as customAdapter from "./providers/custom";

export interface LLMConfig {
  providerType: string;
  apiKey: string;
  baseUrl?: string | null;
  model?: string | null;
}

const adapters: Record<string, typeof anthropicAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  google: googleAdapter,
  custom: customAdapter,
};

function getAdapter(providerType: string) {
  const adapter = adapters[providerType];
  if (!adapter) throw new Error(`Unsupported LLM provider type: ${providerType}`);
  return adapter;
}

export async function callLLMWithConfig(
  config: LLMConfig,
  prompt: string,
  maxRetries: number = 2,
  maxTokens: number = 1200
): Promise<string> {
  const adapter = getAdapter(config.providerType);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await adapter.generate(prompt, {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        maxTokens,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`LLM call attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("LLM call failed after retries");
}

export async function callLLMWithConfigJson<T>(
  config: LLMConfig,
  prompt: string,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLMWithConfig(config, prompt, 0);
      let jsonStr = response.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      const startIndex = jsonStr.indexOf("{");
      const endIndex = jsonStr.lastIndexOf("}");
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsonStr = jsonStr.slice(startIndex, endIndex + 1);
      }
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`JSON parsing attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError || new Error("JSON parsing failed after retries");
}

// LLM은 '업그레이드 엔진' — 즉시 결과는 규칙 기반, LLM은 가치가 생기는 순간에만 호출
export async function callLLMWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs = 20000
): Promise<T | null> {
  return Promise.race([
    fn(),
    new Promise<null>(resolve =>
      setTimeout(() => {
        console.warn(`[LLM] Call timed out after ${timeoutMs}ms, returning null for fallback`);
        resolve(null);
      }, timeoutMs)
    ),
  ]);
}

// ============================================
// Legacy functions (backward compatible, used by system-level jobs)
// These fall back to env-var LLM_API_KEY when no bot LLM is configured
// ============================================

export function hasSystemLLMKey(): boolean {
  return !!(process.env.LLM_API_KEY);
}

function getSystemConfig(): LLMConfig {
  const apiKey = process.env.LLM_API_KEY || "";
  if (!apiKey) throw new Error("LLM_API_KEY is not set. System-level AI features are unavailable. Each bot can still use its own LLM provider configured in Settings.");
  return {
    providerType: "anthropic",
    apiKey,
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929",
  };
}

export async function callLLM(prompt: string, maxRetries: number = 2, maxTokens: number = 1200): Promise<string> {
  return callLLMWithConfig(getSystemConfig(), prompt, maxRetries, maxTokens);
}

export async function callLLMWithJsonParsing<T>(prompt: string, maxRetries: number = 2): Promise<T> {
  return callLLMWithConfigJson<T>(getSystemConfig(), prompt, maxRetries);
}
