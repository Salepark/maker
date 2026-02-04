const LLM_API_KEY = process.env.LLM_API_KEY || "";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  content: Array<{
    type: string;
    text?: string;
  }>;
  stop_reason: string;
}

export async function callLLM(prompt: string, maxRetries: number = 2, maxTokens: number = 1200): Promise<string> {
  if (!LLM_API_KEY) {
    throw new Error("Missing LLM_API_KEY environment variable");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": LLM_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
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

      if (!text) {
        throw new Error("Empty response from Anthropic API");
      }

      return text;
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

export async function callLLMWithJsonParsing<T>(prompt: string, maxRetries: number = 2): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(prompt, 0);
      
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

      const parsed = JSON.parse(jsonStr) as T;
      return parsed;
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
