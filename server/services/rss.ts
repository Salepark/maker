import Parser from "rss-parser";
import { storage } from "../storage";

const parser = new Parser();

async function fetchRSS(feedUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: controller.signal,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectFromSource(sourceId: number, feedUrl: string, sourceTopic?: string): Promise<number> {
  let collected = 0;

  try {
    const xmlContent = await fetchRSS(feedUrl);
    const feed = await parser.parseString(xmlContent);

    for (const item of feed.items ?? []) {
      const url = item.link ?? "";
      if (!url) continue;

      const title = item.title ?? "";
      const content = (item.contentSnippet ?? item.content ?? "").toString();
      const publishedAt = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null;

      try {
        await storage.createItem({
          sourceId,
          externalId: item.guid ?? null,
          url,
          title,
          author: item.creator ?? null,
          contentText: content || title,
          publishedAt,
          status: "new",
          ...(sourceTopic ? { topic: sourceTopic } : {}),
        });
        collected++;
      } catch (error: any) {
        if (error.code === "23505") {
          continue;
        }
        console.error("Error creating item:", error.message);
      }
    }
  } catch (error) {
    console.error("RSS fetch error:", feedUrl, error);
  }

  return collected;
}

export async function collectAllSources(): Promise<{ totalCollected: number; sourcesProcessed: number }> {
  const sources = await storage.getSources();
  let totalCollected = 0;
  let sourcesProcessed = 0;

  for (const source of sources) {
    if (!source.enabled) continue;

    console.log(`Collecting from: ${source.name} (${source.url})`);
    const collected = await collectFromSource(source.id, source.url, source.topic);
    totalCollected += collected;
    sourcesProcessed++;
    console.log(`Collected ${collected} new items from ${source.name}`);
  }

  return { totalCollected, sourcesProcessed };
}

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let idx = 0;
  async function next(): Promise<void> {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (e: any) {
        results[i] = { status: "rejected", reason: e };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => next()));
  return results;
}

export async function collectFromSourceIds(sourceIds: number[]): Promise<{ totalCollected: number; sourcesProcessed: number }> {
  const allSources = await storage.getSources();
  const targetSources = allSources.filter(s => sourceIds.includes(s.id) && s.enabled);

  const tasks = targetSources.map((source) => async () => {
    console.log(`[BotCollect] Collecting from: ${source.name} (${source.url})`);
    const collected = await collectFromSource(source.id, source.url, source.topic);
    console.log(`[BotCollect] Collected ${collected} new items from ${source.name}`);
    return collected;
  });

  const results = await runWithConcurrency(tasks, 5);

  let totalCollected = 0;
  let sourcesProcessed = 0;
  for (const r of results) {
    sourcesProcessed++;
    if (r.status === "fulfilled") {
      totalCollected += r.value;
    }
  }

  return { totalCollected, sourcesProcessed };
}
