import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUserSettings = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const getMySettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const updateApiProvider = mutation({
  args: {
    password: v.string(),
    apiProvider: v.union(v.literal("groq"), v.literal("chatgpt")),
  },
  handler: async (ctx, args) => {
    // Verify password
    const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;
    if (!configuredPassword) {
      throw new Error("Usage dashboard password is not configured");
    }
    if (args.password !== configuredPassword) {
      throw new Error("Incorrect password");
    }

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be authenticated");
    }

    // Update or create settings
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        apiProvider: args.apiProvider,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        apiProvider: args.apiProvider,
      });
    }

    return { success: true };
  },
});
