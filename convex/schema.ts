import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  detections: defineTable({
    userId: v.id("users"),
    imageId: v.id("_storage"),
    result: v.object({
      isDrunk: v.boolean(),
      confidence: v.number(),
      indicators: v.array(v.string()),
      riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    }),
    timestamp: v.number(),
  }).index("by_user", ["userId"]),
  usageEvents: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("groq"), v.literal("gemini"), v.literal("chatgpt")),
    model: v.string(),
    requestSource: v.union(
      v.literal("live_camera"),
      v.literal("uploaded_image"),
      v.literal("uploaded_video"),
      v.literal("stored_image"),
    ),
    status: v.union(v.literal("success"), v.literal("error")),
    latencyMs: v.number(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_user_timestamp", ["userId", "timestamp"]),
  usageSummaries: defineTable({
    userId: v.id("users"),
    requestCount: v.number(),
    successCount: v.number(),
    errorCount: v.number(),
    groqRequestCount: v.number(),
    geminiRequestCount: v.number(),
    chatgptRequestCount: v.optional(v.number()),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    lastRequestAt: v.number(),
  }).index("by_user", ["userId"]),
  userSettings: defineTable({
    userId: v.id("users"),
    apiProvider: v.union(v.literal("groq"), v.literal("chatgpt")),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
