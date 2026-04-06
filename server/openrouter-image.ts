const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Listed on https://openrouter.ai/docs/guides/overview/multimodal/image-generation */
const DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image";

type ContentPart = {
  type?: string;
  text?: string;
  image_url?: { url?: string };
  imageUrl?: { url?: string };
};

function extractUrlFromImageItem(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const o = item as Record<string, unknown>;
  const nested =
    (o.image_url as { url?: string } | undefined)?.url ??
    (o.imageUrl as { url?: string } | undefined)?.url;
  if (typeof nested === "string" && nested.length > 0) return nested;
  const direct = o.url;
  if (typeof direct === "string" && direct.startsWith("data:image")) return direct;
  return undefined;
}

/**
 * OpenRouter may return images in `message.images`, or as parts in `message.content`.
 */
function extractImageDataUrlFromMessage(message: any): string | undefined {
  if (!message || typeof message !== "object") return undefined;

  const images = message.images;
  if (Array.isArray(images)) {
    for (const item of images) {
      const url = extractUrlFromImageItem(item);
      if (url) return url;
    }
  }

  const content = message.content;
  if (Array.isArray(content)) {
    for (const part of content as ContentPart[]) {
      if (!part || typeof part !== "object") continue;
      if (part.type === "image_url" || part.image_url || part.imageUrl) {
        const url = part.image_url?.url ?? part.imageUrl?.url;
        if (typeof url === "string" && url.length > 0) return url;
      }
    }
  }

  if (typeof content === "string" && content.startsWith("data:image")) {
    return content;
  }

  return undefined;
}

async function openRouterChatCompletion(body: Record<string, unknown>): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
  };
  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  if (referer) headers["HTTP-Referer"] = referer;
  headers["X-Title"] = process.env.OPENROUTER_APP_TITLE?.trim() || "EduContent Creator";

  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`OpenRouter error (${res.status}): ${rawText.slice(0, 800)}`);
  }

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error("OpenRouter returned invalid JSON");
  }
}

/**
 * Generate an image via OpenRouter chat completions (models with image output).
 * Returns a data URL (base64) or https URL suitable for <img src>.
 */
export async function generateImageWithOpenRouter(prompt: string): Promise<string> {
  const model = (process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_IMAGE_MODEL).trim();

  const basePayload = {
    model,
    messages: [{ role: "user", content: prompt }],
  };

  const attempts: Record<string, unknown>[] = [
    { ...basePayload, modalities: ["image", "text"] },
    { ...basePayload, modalities: ["image"] },
  ];

  let lastError = "OpenRouter returned no image";

  for (let i = 0; i < attempts.length; i++) {
    const json = await openRouterChatCompletion(attempts[i]);
    const message = json.choices?.[0]?.message;
    const url = extractImageDataUrlFromMessage(message);
    if (url) return url;

    const preview = JSON.stringify(message ?? {}).slice(0, 400);
    console.error(
      `[openrouter-image] No image in response (attempt ${i + 1}/${attempts.length}). Message preview:`,
      preview,
    );
    lastError =
      "OpenRouter returned no image — try OPENROUTER_IMAGE_MODEL with output_modalities including image, or check account credits.";
  }

  throw new Error(lastError);
}
