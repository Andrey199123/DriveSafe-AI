import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const providerValidator = v.union(v.literal("groq"), v.literal("gemini"), v.literal("chatgpt"));
const requestSourceValidator = v.union(
  v.literal("live_camera"),
  v.literal("uploaded_image"),
  v.literal("uploaded_video"),
  v.literal("stored_image"),
);

// Internal query to get or create a guest user for anonymous usage tracking
export const getOrCreateGuestUser = internalMutation({
  args: {},
  handler: async (ctx): Promise<Id<"users">> => {
    // Look for existing guest user by email
    const existingGuest = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "guest@drivesafe.app"))
      .first();

    if (existingGuest) {
      return existingGuest._id;
    }

    // Create a guest user if it doesn't exist
    const guestUserId = await ctx.db.insert("users", {
      email: "guest@drivesafe.app",
      name: "Guest User",
      emailVerificationTime: Date.now(),
    });

    return guestUserId;
  },
});
  },
});

export const recordUsageEvent = internalMutation({
  args: {
    userId: v.id("users"),
    provider: providerValidator,
    model: v.string(),
    requestSource: requestSourceValidator,
    status: v.union(v.literal("success"), v.literal("error")),
    latencyMs: v.number(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    await ctx.db.insert("usageEvents", {
      userId: args.userId,
      provider: args.provider,
      model: args.model,
      requestSource: args.requestSource,
      status: args.status,
      latencyMs: args.latencyMs,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      errorMessage: args.errorMessage,
      timestamp,
    });

    const existingSummary = await ctx.db
      .query("usageSummaries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const summaryPatch = {
      requestCount: (existingSummary?.requestCount ?? 0) + 1,
      successCount:
        (existingSummary?.successCount ?? 0) + (args.status === "success" ? 1 : 0),
      errorCount:
        (existingSummary?.errorCount ?? 0) + (args.status === "error" ? 1 : 0),
      groqRequestCount:
        (existingSummary?.groqRequestCount ?? 0) + (args.provider === "groq" ? 1 : 0),
      geminiRequestCount:
        (existingSummary?.geminiRequestCount ?? 0) + (args.provider === "gemini" ? 1 : 0),
      chatgptRequestCount:
        (existingSummary?.chatgptRequestCount ?? 0) + (args.provider === "chatgpt" ? 1 : 0),
      promptTokens: (existingSummary?.promptTokens ?? 0) + (args.promptTokens ?? 0),
      completionTokens:
        (existingSummary?.completionTokens ?? 0) + (args.completionTokens ?? 0),
      totalTokens: (existingSummary?.totalTokens ?? 0) + (args.totalTokens ?? 0),
      lastRequestAt: timestamp,
    };

    if (existingSummary) {
      await ctx.db.patch(existingSummary._id, summaryPatch);
    } else {
      await ctx.db.insert("usageSummaries", {
        userId: args.userId,
        ...summaryPatch,
      });
    }
  },
});

export const getUsageDashboard = query({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;
    if (!configuredPassword) {
      throw new Error("Usage dashboard password is not configured");
    }
    if (args.password !== configuredPassword) {
      throw new Error("Incorrect usage dashboard password");
    }

    const usageSummaries = await ctx.db.query("usageSummaries").collect();
    const recentEvents = await ctx.db.query("usageEvents").order("desc").take(20);

    const totals = usageSummaries.reduce(
      (acc, summary) => {
        acc.requestCount += summary.requestCount;
        acc.successCount += summary.successCount;
        acc.errorCount += summary.errorCount;
        acc.groqRequestCount += summary.groqRequestCount;
        acc.geminiRequestCount += summary.geminiRequestCount;
        acc.chatgptRequestCount += summary.chatgptRequestCount ?? 0;
        acc.promptTokens += summary.promptTokens;
        acc.completionTokens += summary.completionTokens;
        acc.totalTokens += summary.totalTokens;
        acc.lastRequestAt = Math.max(acc.lastRequestAt ?? 0, summary.lastRequestAt);
        return acc;
      },
      {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        groqRequestCount: 0,
        geminiRequestCount: 0,
        chatgptRequestCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        lastRequestAt: null as number | null,
      },
    );

    return {
      totals,
      recentEvents,
    };
  },
});
