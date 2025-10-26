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
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
