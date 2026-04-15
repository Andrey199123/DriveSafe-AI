import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

const GEMINI_MODEL = "gemini-2.0-flash";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be authenticated to upload images");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const analyzeImage = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be authenticated");
    }

    const startedAt = Date.now();
    let status: "success" | "error" = "error";
    let errorMessage: string | undefined;
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let totalTokens: number | undefined;

    try {
      // Get the image URL for analysis
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) {
        throw new Error("Image not found");
      }

      // Fetch the image as a buffer
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error("Failed to fetch image");
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Convert ArrayBuffer to base64 without using Buffer
      const uint8Array = new Uint8Array(imageBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const base64Image = btoa(binaryString);

      // Use Gemini API to analyze the image
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze this image for signs of alcohol intoxication. Look for:
                  - Bloodshot or glassy eyes
                  - Facial flushing or redness
                  - Droopy eyelids or unfocused gaze
                  - Disheveled appearance
                  - Poor posture or balance issues
                  - Any other visible signs of impairment
                  
                  Respond with a JSON object containing:
                  - isDrunk: boolean (true if signs of intoxication are present)
                  - confidence: number (0-100, confidence in the assessment)
                  - indicators: array of strings (specific signs observed)
                  - riskLevel: "low", "medium", or "high"
                  
                  Be conservative in your assessment - only indicate intoxication if clear signs are visible.
                  
                  Return ONLY the JSON object, no other text.`
                  },
                  {
                    inline_data: {
                      mime_type: imageResponse.headers.get('content-type') || 'image/jpeg',
                      data: base64Image
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 500,
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const geminiResult = await response.json();
      promptTokens = geminiResult.usageMetadata?.promptTokenCount;
      completionTokens = geminiResult.usageMetadata?.candidatesTokenCount;
      totalTokens = geminiResult.usageMetadata?.totalTokenCount;

      let result;
      try {
        const content = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
          throw new Error("No response from Gemini AI");
        }
        
        // Clean up the response text to extract JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        
        result = JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error("Failed to parse Gemini response:", error);
        // Fallback if JSON parsing fails
        result = {
          isDrunk: false,
          confidence: 0,
          indicators: ["Analysis failed - unable to determine"],
          riskLevel: "low" as const,
        };
      }

      // Save the detection result
      await ctx.runMutation(api.detections.saveDetection, {
        imageId: args.storageId,
        result,
      });

      status = "success";
      return result;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unknown Gemini request error";
      throw error;
    } finally {
      try {
        await ctx.runMutation(internal.usage.recordUsageEvent, {
          userId,
          provider: "gemini",
          model: GEMINI_MODEL,
          requestSource: "stored_image",
          status,
          latencyMs: Date.now() - startedAt,
          promptTokens,
          completionTokens,
          totalTokens,
          errorMessage,
        });
      } catch (loggingError) {
        console.error("Failed to record Gemini usage event:", loggingError);
      }
    }
  },
});

export const saveDetection = mutation({
  args: {
    imageId: v.id("_storage"),
    result: v.object({
      isDrunk: v.boolean(),
      confidence: v.number(),
      indicators: v.array(v.string()),
      riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be authenticated");
    }

    return await ctx.db.insert("detections", {
      userId,
      imageId: args.imageId,
      result: args.result,
      timestamp: Date.now(),
    });
  },
});

export const getDetections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const detections = await ctx.db
      .query("detections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    return Promise.all(
      detections.map(async (detection) => ({
        ...detection,
        imageUrl: await ctx.storage.getUrl(detection.imageId),
      }))
    );
  },
});
