import { getOpenAIClient } from "../openai";

export interface OpenAIGenerateOptions {
  systemMessage: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

/**
 * Generic helper that calls OpenAI with JSON response format,
 * parses the result, and extracts a top-level key.
 *
 * Every content-generation function in openai.ts follows this exact
 * pattern — this helper eliminates the duplication.
 */
export async function callOpenAIJSON<T>(
  options: OpenAIGenerateOptions,
  extractKey?: string,
): Promise<T> {
  const {
    systemMessage,
    prompt,
    maxTokens = 4096,
    temperature = 0.7,
    timeout = 30000,
  } = options;

  const response = await getOpenAIClient().chat.completions.create(
    {
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens,
      temperature,
    },
    { timeout },
  );

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return extractKey ? result[extractKey] ?? [] : result;
  } catch (parseError) {
    console.error("Failed to parse OpenAI JSON response:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
