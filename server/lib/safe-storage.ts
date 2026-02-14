import { driver } from "../db";
import type { Response } from "express";

export class NotImplementedError extends Error {
  constructor(methodName: string) {
    super(`[SQLite MVP] "${methodName}" is not yet available in local mode. Core features (Fast Report, Console, Bots) work normally.`);
    this.name = "NotImplementedError";
  }
}

export function isSqliteMode(): boolean {
  return driver === "sqlite";
}

export function handleApiError(res: Response, error: unknown, fallbackMsg: string): void {
  const err = error as Error;
  if (err?.name === "NotImplementedError" || err instanceof NotImplementedError) {
    console.warn(`[Route:501] ${err.message}`);
    res.status(501).json({
      error: err.message,
      code: "NOT_IMPLEMENTED_SQLITE",
      hint: "이 기능은 로컬 MVP에서 아직 비활성입니다. Fast Report와 Console은 정상 작동합니다.",
    });
    return;
  }
  console.error(fallbackMsg, error);
  res.status(500).json({ error: fallbackMsg });
}

export function safeStorageCall<T>(
  fallback: T,
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn().catch((err: Error) => {
    if (err instanceof NotImplementedError || err?.name === "NotImplementedError") {
      console.warn(`[SafeStorage] ${label}: ${err.message}`);
      return fallback;
    }
    throw err;
  });
}
