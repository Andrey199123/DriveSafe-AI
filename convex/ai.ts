import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type VisionObservation = {
  eyesRed?: boolean;
  eyesGlassy?: boolean;
  eyesHalfClosed?: boolean;
  eyesClosed?: boolean;
  faceRed?: boolean;
  lookingAway?: boolean;
  confidence?: number;
};

type RequestSource = "live_camera" | "uploaded_image" | "uploaded_video";

type AnalysisResult = {
  isDrunk: boolean;
  isSleepy: boolean;
  isDistracted: boolean;
  confidence: number;
  indicators: string[];
  state: "drunk" | "sleepy" | "distracted" | "normal";
};

const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const CHATGPT_MODEL = "gpt-4o";

async function analyzeGroq(
  ctx: any,
  base64Image: string,
  source: RequestSource,
  userId: Id<"users"> | null
): Promise<AnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  const startedAt = Date.now();
  let status: "success" | "error" = "error";
  let errorMessage: string | undefined;
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let totalTokens: number | undefined;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a computer vision system that analyzes images and returns structured data about visual features. Focus only on observable visual characteristics.",
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
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    promptTokens = result.usage?.prompt_tokens;
    completionTokens = result.usage?.completion_tokens;
    totalTokens = result.usage?.total_tokens;

    const message = result.choices?.[0]?.message;
    const content = message?.content;
    const refusal = message?.refusal;

    if (refusal) {
      throw new Error(`Groq refused the request: ${refusal}`);
    }

    if (!content) {
      if (result.error) {
        throw new Error(`Groq API error: ${result.error.message}`);
      }
      throw new Error("Groq returned an empty response");
    }

    let cleanContent = content.trim();
    if (cleanContent.includes("```json")) {
      cleanContent = cleanContent.replace(/```json\n?/, "").replace(/```\n?$/, "").trim();
    } else if (cleanContent.includes("```")) {
      cleanContent = cleanContent.replace(/```\n?/, "").replace(/```\n?$/, "").trim();
    }

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Groq response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as VisionObservation;
    const eyesRed = parsed.eyesRed ?? false;
    const eyesGlassy = parsed.eyesGlassy ?? false;
    const eyesHalfClosed = parsed.eyesHalfClosed ?? false;
    const eyesClosed = parsed.eyesClosed ?? false;
    const faceRed = parsed.faceRed ?? false;
    const lookingAway = parsed.lookingAway ?? false;

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

    status = "success";
    return {
      isDrunk,
      isSleepy,
      isDistracted,
      confidence: parsed.confidence ?? 75,
      indicators,
      state,
    };
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown Groq request error";
    throw error;
  } finally {
    try {
      // Only record usage if user is authenticated
      if (userId) {
        await ctx.runMutation(internal.usage.recordUsageEvent, {
          userId,
          provider: "groq",
          model: GROQ_MODEL,
          requestSource: source,
          status,
          latencyMs: Date.now() - startedAt,
          promptTokens,
          completionTokens,
          totalTokens,
          errorMessage,
        });
      }
    } catch (loggingError) {
      console.error("Failed to record Groq usage event:", loggingError);
    }
  }
}

export const analyzeFrame = action({
  args: {
    base64Image: v.string(),
    source: v.union(
      v.literal("live_camera"),
      v.literal("uploaded_image"),
      v.literal("uploaded_video"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    // Allow guest users - use null for userId if not authenticated
    let provider: "groq" | "chatgpt" = "groq"; // Default provider for guests
    
    if (userId) {
      // Get user's preferred provider if authenticated
      const userSettings = await ctx.runQuery(internal.settings.getUserSettings, {
        userId,
      });
      provider = userSettings?.apiProvider ?? "groq";
    }

    // Route to appropriate provider (userId can be null for guests)
    if (provider === "chatgpt") {
      return await analyzeChatGPT(ctx, args.base64Image, args.source, userId as Id<"users"> | null);
    } else {
      return await analyzeGroq(ctx, args.base64Image, args.source, userId as Id<"users"> | null);
    }
  },
});

async function analyzeChatGPT(
  ctx: any,
  base64Image: string,
  source: RequestSource,
  userId: Id<"users"> | null
): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const startedAt = Date.now();
  let status: "success" | "error" = "error";
  let errorMessage: string | undefined;
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let totalTokens: number | undefined;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CHATGPT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a computer vision system that analyzes images and returns structured data about visual features. Focus only on observable visual characteristics.",
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
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ChatGPT API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    promptTokens = result.usage?.prompt_tokens;
    completionTokens = result.usage?.completion_tokens;
    totalTokens = result.usage?.total_tokens;

    const message = result.choices?.[0]?.message;
    const content = message?.content;

    if (!content) {
      throw new Error("ChatGPT returned an empty response");
    }

    // Parse JSON response
    let cleanContent = content.trim();
    if (cleanContent.includes("```json")) {
      cleanContent = cleanContent.replace(/```json\n?/, "").replace(/```\n?$/, "").trim();
    } else if (cleanContent.includes("```")) {
      cleanContent = cleanContent.replace(/```\n?/, "").replace(/```\n?$/, "").trim();
    }

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in ChatGPT response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as VisionObservation;
    const eyesRed = parsed.eyesRed ?? false;
    const eyesGlassy = parsed.eyesGlassy ?? false;
    const eyesHalfClosed = parsed.eyesHalfClosed ?? false;
    const eyesClosed = parsed.eyesClosed ?? false;
    const faceRed = parsed.faceRed ?? false;
    const lookingAway = parsed.lookingAway ?? false;

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

    status = "success";
    return {
      isDrunk,
      isSleepy,
      isDistracted,
      confidence: parsed.confidence ?? 75,
      indicators,
      state,
    };
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown ChatGPT request error";
    throw error;
  } finally {
    try {
      // Only record usage if user is authenticated
      if (userId) {
        await ctx.runMutation(internal.usage.recordUsageEvent, {
          userId,
          provider: "chatgpt",
          model: CHATGPT_MODEL,
          requestSource: source,
          status,
          latencyMs: Date.now() - startedAt,
          promptTokens,
          completionTokens,
          totalTokens,
          errorMessage,
        });
      }
    } catch (loggingError) {
      console.error("Failed to record ChatGPT usage event:", loggingError);
    }
  }
}
