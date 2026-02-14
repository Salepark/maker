interface OpenAIResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

export async function generate(
  prompt: string,
  options: { apiKey: string; baseUrl?: string | null; model?: string | null; maxTokens?: number }
): Promise<string> {
  const url = (options.baseUrl || "https://api.openai.com") + "/v1/chat/completions";
  const model = options.model || "gpt-4o";
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
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data: OpenAIResponse = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error("Empty response from OpenAI API");
  return text;
}
