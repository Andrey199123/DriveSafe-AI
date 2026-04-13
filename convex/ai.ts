import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

type VisionObservation = {
  eyesRed?: boolean;
  eyesGlassy?: boolean;
  eyesHalfClosed?: boolean;
  eyesClosed?: boolean;
  faceRed?: boolean;
  lookingAway?: boolean;
  confidence?: number;
};

export const analyzeFrame = action({
  args: {
    base64Image: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be authenticated");
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
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
                  url: args.base64Image,
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

    return {
      isDrunk,
      isSleepy,
      isDistracted,
      confidence: parsed.confidence ?? 75,
      indicators,
      state,
    };
  },
});
