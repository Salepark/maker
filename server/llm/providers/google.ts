interface GoogleResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
    finishReason: string;
  }>;
}

export async function generate(
  prompt: string,
  options: { apiKey: string; baseUrl?: string | null; model?: string | null; maxTokens?: number }
): Promise<string> {
  const model = options.model || "gemini-2.0-flash";
  const baseUrl = options.baseUrl || "https://generativelanguage.googleapis.com";
  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${options.apiKey}`;
  const maxTokens = options.maxTokens || 1200;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
  }

  const data: GoogleResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("");

  if (!text) throw new Error("Empty response from Google AI API");
  return text;
}
