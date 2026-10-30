export const MICRODC_MODEL = "qwen2.5vl:7b";

const IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const OBSERVATION_KEYS = ["eyesRed", "eyesGlassy", "eyesHalfClosed", "eyesClosed", "faceRed", "lookingAway", "confidence"] as const;

export type MicroDCObservation = {
  isDrunk: boolean;
  isSleepy: boolean;
  isDistracted: boolean;
  confidence: number;
  state: "drunk" | "sleepy" | "distracted" | "normal";
  indicators: string[];
  eyesClosed: boolean;
  lookingAway: boolean;
  faceVisible: boolean;
  observationOnly: boolean;
};

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function extractText(content: unknown): string | undefined {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("\n")
      .trim();
    return text || undefined;
  }
  return undefined;
}

function parseObservationJson(content: string): Record<string, unknown> {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("MicroDC returned an invalid observation. Please retry.");
  }
  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    throw new Error("MicroDC returned an invalid observation. Please retry.");
  }
}

export async function observeMicroDC(image: string): Promise<MicroDCObservation> {
  if (!IMAGE_PATTERN.test(image) || image.length > 4_000_000) {
    throw new Error("Provide a JPEG, PNG, or WebP image under 3 MB.");
  }
  const key = process.env.MICRODC_API_KEY;
  if (!key) throw new Error("MicroDC is not configured. Set MICRODC_API_KEY on the backend.");
  const base = process.env.MICRODC_BASE_URL || "https://api.microdc.ai/v1";
  if (new URL(base).protocol !== "https:") throw new Error("MicroDC requires HTTPS.");
  const response = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(45_000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MICRODC_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a computer vision system that analyzes images and returns structured data about visual features. Focus only on observable visual characteristics.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Perform computer vision analysis on this image to detect facial and eye characteristics. Return ONLY a JSON object with these visual observations:
{
  "eyesRed": true or false,
  "eyesGlassy": true or false,
  "eyesHalfClosed": true or false,
  "eyesClosed": true or false,
  "faceRed": true or false,
  "lookingAway": true or false,
  "confidence": number 0-100
}

Detect these visual features:
- eyesRed: Are the eyes red in color?
- eyesGlassy: Do the eyes have a glassy/reflective appearance?
- eyesHalfClosed: Are the eyelids partially closed?
- eyesClosed: Are the eyes completely closed?
- faceRed: Is the face flushed or red?
- lookingAway: Is the person looking away from the camera?
- confidence: Your confidence in these visual observations (0-100)

Return ONLY the JSON object.`,
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.3,
    }),
  });
  if (!response.ok) throw new Error(`MicroDC request failed (${response.status}).`);
  const body = await response.json();
  const content = extractText(body.choices?.[0]?.message?.content);
  if (!content) throw new Error("MicroDC returned no observation.");
  const parsed = parseObservationJson(content);
  const observation = {
    eyesRed: asBoolean(parsed.eyesRed),
    eyesGlassy: asBoolean(parsed.eyesGlassy),
    eyesHalfClosed: asBoolean(parsed.eyesHalfClosed),
    eyesClosed: asBoolean(parsed.eyesClosed),
    faceRed: asBoolean(parsed.faceRed),
    lookingAway: asBoolean(parsed.lookingAway),
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
  };
  for (const key of OBSERVATION_KEYS) {
    if (key === "confidence") continue;
    if (typeof observation[key as keyof typeof observation] !== "boolean") {
      throw new Error("MicroDC returned an incomplete observation.");
    }
  }

  const eyesRed = observation.eyesRed ?? false;
  const eyesGlassy = observation.eyesGlassy ?? false;
  const eyesHalfClosed = observation.eyesHalfClosed ?? false;
  const eyesClosed = observation.eyesClosed ?? false;
  const faceRed = observation.faceRed ?? false;
  const lookingAway = observation.lookingAway ?? false;

  const isDrunk = (eyesRed || eyesGlassy) && (faceRed || eyesHalfClosed);
  const isSleepy = eyesClosed || eyesHalfClosed;
  const isDistracted = lookingAway;

  const indicators: string[] = [];
  if (eyesRed) indicators.push("red eyes");
  if (eyesGlassy) indicators.push("glassy eyes");
  if (eyesHalfClosed) indicators.push("droopy eyelids");
  if (eyesClosed) indicators.push("eyes closed");
  if (faceRed) indicators.push("facial redness");
  if (lookingAway) indicators.push("looking away");

  let state: "drunk" | "sleepy" | "distracted" | "normal" = "normal";
  if (isDrunk) state = "drunk";
  else if (isSleepy) state = "sleepy";
  else if (isDistracted) state = "distracted";

  return {
    isDrunk,
    isSleepy,
    isDistracted,
    confidence: observation.confidence ?? 75,
    indicators,
    state,
    eyesClosed,
    lookingAway,
    faceVisible: true,
    observationOnly: true,
  };
}
