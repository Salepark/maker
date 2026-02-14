export async function generate(
  prompt: string,
  options: { apiKey: string; baseUrl?: string | null; model?: string | null; maxTokens?: number }
): Promise<string> {
  if (!options.baseUrl) {
    throw new Error("Custom provider requires a baseUrl");
  }

  const url = options.baseUrl + "/v1/chat/completions";
  const model = options.model || "default";
  const maxTokens = options.maxTokens || 1200;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
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
    throw new Error(`Custom LLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  const text = data.choices?.[0]?.message?.content
    || data.content?.[0]?.text
    || (typeof data.text === "string" ? data.text : null);

  if (!text) throw new Error("Empty response from custom LLM API");
  return text;
}
