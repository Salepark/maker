import Parser from "rss-parser";
import { storage } from "../storage";

const parser = new Parser();

export async function collectFromSource(sourceId: number, feedUrl: string): Promise<number> {
  let collected = 0;

  try {
    const feed = await parser.parseURL(feedUrl);

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
    const collected = await collectFromSource(source.id, source.url);
    totalCollected += collected;
    sourcesProcessed++;
    console.log(`Collected ${collected} new items from ${source.name}`);
  }

  return { totalCollected, sourcesProcessed };
}
