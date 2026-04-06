const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image";

type OpenRouterImagePart = {
  image_url?: { url?: string };
  imageUrl?: { url?: string };
};

/**
 * Generate an image via OpenRouter chat completions (models with image output).
 * Returns a data URL (base64) suitable for <img src>.
 */
export async function generateImageWithOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = (process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_IMAGE_MODEL).trim();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  if (referer) headers["HTTP-Referer"] = referer;
  const title = process.env.OPENROUTER_APP_TITLE?.trim() || "EduContent Creator";
  headers["X-Title"] = title;

  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`OpenRouter image error (${res.status}): ${rawText.slice(0, 500)}`);
  }

  let json: any;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error("OpenRouter returned invalid JSON");
  }

  const message = json.choices?.[0]?.message;
  const images: OpenRouterImagePart[] | undefined = message?.images;
  if (!images?.length) {
    throw new Error("OpenRouter returned no images — check OPENROUTER_IMAGE_MODEL supports image output");
  }

  const first = images[0];
  const url = first.image_url?.url ?? first.imageUrl?.url;
  if (!url || typeof url !== "string") {
    throw new Error("OpenRouter image response missing URL");
  }

  return url;
}
