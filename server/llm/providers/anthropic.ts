interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string;
}

export async function generate(
  prompt: string,
  options: { apiKey: string; baseUrl?: string | null; model?: string | null; maxTokens?: number }
): Promise<string> {
  const url = (options.baseUrl || "https://api.anthropic.com") + "/v1/messages";
  const model = options.model || "claude-sonnet-4-5-20250929";
  const maxTokens = options.maxTokens || 1200;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data: AnthropicResponse = await response.json();
  const text = data.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("");

  if (!text) throw new Error("Empty response from Anthropic API");
  return text;
}
