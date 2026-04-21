import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock types for Convex context
type MockUserId = any;

interface MockUsageEvent {
  _id: string;
  userId: MockUserId;
  provider: "groq" | "gemini" | "chatgpt";
  model: string;
  requestSource: "live_camera" | "uploaded_image" | "uploaded_video" | "stored_image";
  status: "success" | "error";
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  errorMessage?: string;
  timestamp: number;
}

interface MockUsageSummary {
  _id: string;
  userId: MockUserId;
  requestCount: number;
  successCount: number;
  errorCount: number;
  groqRequestCount: number;
  geminiRequestCount: number;
  chatgptRequestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  lastRequestAt: number;
}

interface MockQueryBuilder {
  withIndex: (indexName: string, fn: (q: any) => any) => MockQueryBuilder;
  unique: () => Promise<MockUsageSummary | null>;
}

interface MockDb {
  query: (tableName: string) => MockQueryBuilder;
  insert: (tableName: string, doc: any) => Promise<string>;
  patch: (id: string, updates: Partial<MockUsageSummary>) => Promise<void>;
}

interface MockContext {
  db: MockDb;
}

describe("ChatGPT Usage Tracking Unit Tests", () => {
  let mockDb: MockDb;
  let mockContext: MockContext;
  let mockQueryBuilder: MockQueryBuilder;
  const mockUserId = "user123" as MockUserId;
  const mockEventId = "event123";
  const mockSummaryId = "summary123";

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock query builder
    mockQueryBuilder = {
      withIndex: vi.fn().mockReturnThis(),
      unique: vi.fn().mockResolvedValue(null),
    };

    // Create mock database
    mockDb = {
      query: vi.fn().mockReturnValue(mockQueryBuilder),
      insert: vi.fn().mockResolvedValue(mockEventId),
      patch: vi.fn().mockResolvedValue(undefined),
    };

    // Create mock context
    mockContext = {
      db: mockDb,
    };
  });

  describe("ChatGPT Event Recording", () => {
    it("should record ChatGPT events with provider='chatgpt'", async () => {
      const eventData = {
        userId: mockUserId,
        provider: "chatgpt" as const,
        model: "gpt-4o",
        requestSource: "live_camera" as const,
        status: "success" as const,
        latencyMs: 1500,
        promptTokens: 1200,
        completionTokens: 150,
        totalTokens: 1350,
        timestamp: Date.now(),
      };

      await mockContext.db.insert("usageEvents", eventData);

      expect(mockDb.insert).toHaveBeenCalledWith("usageEvents", eventData);
      expect(mockDb.insert).toHaveBeenCalledWith(
        "usageEvents",
        expect.objectContaining({
          provider: "chatgpt",
          model: "gpt-4o",
        })
      );
    });

    it("should record ChatGPT events with all required fields", async () => {
      const eventData = {
        userId: mockUserId,
        provider: "chatgpt" as const,
        model: "gpt-4o",
        requestSource: "uploaded_image" as const,
        status: "success" as const,
        latencyMs: 2000,
        promptTokens: 1500,
        completionTokens: 200,
        totalTokens: 1700,
        timestamp: Date.now(),
      };

      await mockContext.db.insert("usageEvents", eventData);

      const insertCall = vi.mocked(mockDb.insert).mock.calls[0];
      const insertedData = insertCall[1];

      expect(insertedData).toHaveProperty("userId");
      expect(insertedData).toHaveProperty("provider");
      expect(insertedData).toHaveProperty("model");
      expect(insertedData).toHaveProperty("requestSource");
      expect(insertedData).toHaveProperty("status");
      expect(insertedData).toHaveProperty("latencyMs");
      expect(insertedData).toHaveProperty("timestamp");
    });

    it("should record ChatGPT events with token counts", async () => {
      const eventData = {
        userId: mockUserId,
        provider: "chatgpt" as const,
        model: "gpt-4o",
        requestSource: "live_camera" as const,
        status: "success" as const,
        latencyMs: 1800,
        promptTokens: 1300,
        completionTokens: 180,
        totalTokens: 1480,
        timestamp: Date.now(),
      };

      await mockContext.db.insert("usageEvents", eventData);

      expect(mockDb.insert).toHaveBeenCalledWith(
        "usageEvents",
        expect.objectContaining({
          promptTokens: 1300,
          completionTokens: 180,
          totalTokens: 1480,
        })
      );
    });

    it("should record ChatGPT events from different request sources", async () => {
      const sources: Array<"live_camera" | "uploaded_image" | "uploaded_video"> = [
        "live_camera",
        "uploaded_image",
        "uploaded_video",
      ];

      for (const source of sources) {
        const eventData = {
          userId: mockUserId,
          provider: "chatgpt" as const,
          model: "gpt-4o",
          requestSource: source,
          status: "success" as const,
          latencyMs: 1500,
          promptTokens: 1200,
          completionTokens: 150,
          totalTokens: 1350,
          timestamp: Date.now(),
        };

        await mockContext.db.insert("usageEvents", eventData);
      }

      expect(mockDb.insert).toHaveBeenCalledTimes(3);
      expect(mockDb.insert).toHaveBeenCalledWith(
        "usageEvents",
        expect.objectContaining({ requestSource: "live_camera" })
      );
      expect(mockDb.insert).toHaveBeenCalledWith(
        "usageEvents",
        expect.objectContaining({ requestSource: "uploaded_image" })
      );
      expect(mockDb.insert).toHaveBeenCalledWith(
        "usageEvents",
        expect.objectContaining({ requestSource: "uploaded_video" })
      );
    });
  });

  describe("ChatGPT Request Count Increment", () => {
    it("should increment chatgptRequestCount when creating new summary", async () => {
      mockQueryBuilder.unique = vi.fn().mockResolvedValue(null);

      // Simulate creating new summary with ChatGPT request
      const summaryData = {
        userId: mockUserId,
        requestCount: 1,
        successCount: 1,
        errorCount: 0,
        groqRequestCount: 0,
        geminiRequestCount: 0,
        chatgptRequestCount: 1,
        promptTokens: 1200,
        completionTokens: 150,
        totalTokens: 1350,
        lastRequestAt: Date.now(),
      };

      await mockContext.db.insert("usageSummaries", summaryData);

      expect(mockDb.insert).toHaveBeenCalledWith(
        "usageSummaries",
        expect.objectContaining({
          chatgptRequestCount: 1,
        })
      );
    });

    it("should increment chatgptRequestCount when updating existing summary", async () => {
      const existingSummary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 5,
        successCount: 4,
        errorCount: 1,
        groqRequestCount: 3,
        geminiRequestCount: 2,
        chatgptRequestCount: 0,
        promptTokens: 5000,
        completionTokens: 500,
        totalTokens: 5500,
        lastRequestAt: Date.now() - 10000,
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSummary);

      // Simulate updating summary with new ChatGPT request
      const updates = {
        requestCount: 6,
        successCount: 5,
        chatgptRequestCount: 1,
        promptTokens: 6200,
        completionTokens: 650,
        totalTokens: 6850,
        lastRequestAt: Date.now(),
      };

      await mockContext.db.patch(existingSummary._id, updates);

      expect(mockDb.patch).toHaveBeenCalledWith(
        mockSummaryId,
        expect.objectContaining({
          chatgptRequestCount: 1,
        })
      );
    });

    it("should increment chatgptRequestCount for multiple ChatGPT requests", async () => {
      const existingSummary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 10,
        successCount: 9,
        errorCount: 1,
        groqRequestCount: 5,
        geminiRequestCount: 3,
        chatgptRequestCount: 2,
        promptTokens: 10000,
        completionTokens: 1000,
        totalTokens: 11000,
        lastRequestAt: Date.now() - 10000,
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSummary);

      // Simulate adding another ChatGPT request
      const updates = {
        requestCount: 11,
        successCount: 10,
        chatgptRequestCount: 3,
        promptTokens: 11200,
        completionTokens: 1150,
        totalTokens: 12350,
        lastRequestAt: Date.now(),
      };

      await mockContext.db.patch(existingSummary._id, updates);

      expect(mockDb.patch).toHaveBeenCalledWith(
        mockSummaryId,
        expect.objectContaining({
          chatgptRequestCount: 3,
        })
      );
    });

    it("should not increment chatgptRequestCount for non-ChatGPT requests", async () => {
      const existingSummary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 5,
        successCount: 5,
        errorCount: 0,
        groqRequestCount: 3,
        geminiRequestCount: 2,
        chatgptRequestCount: 0,
        promptTokens: 5000,
        completionTokens: 500,
        totalTokens: 5500,
        lastRequestAt: Date.now() - 10000,
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSummary);

      // Simulate adding a Groq request (not ChatGPT)
      const updates = {
        requestCount: 6,
        successCount: 6,
        groqRequestCount: 4,
        chatgptRequestCount: 0, // Should remain 0
        promptTokens: 6000,
        completionTokens: 600,
        totalTokens: 6600,
        lastRequestAt: Date.now(),
      };

      await mockContext.db.patch(existingSummary._id, updates);

      expect(mockDb.patch).toHaveBeenCalledWith(
        mockSummaryId,
        expect.objectContaining({
          chatgptRequestCount: 0,
        })
      );
    });
  });

  describe("Token Count Aggregation", () => {
    it("should aggregate ChatGPT token counts correctly", async () => {
      const existingSummary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 5,
        successCount: 5,
        errorCount: 0,
        groqRequestCount: 5,
        geminiRequestCount: 0,
        chatgptRequestCount: 0,
        promptTokens: 5000,
        completionTokens: 500,
        totalTokens: 5500,
        lastRequestAt: Date.now() - 10000,
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSummary);

      // Simulate adding ChatGPT request with tokens
      const newPromptTokens = 1200;
      const newCompletionTokens = 150;
      const newTotalTokens = 1350;

      const updates = {
        requestCount: 6,
        successCount: 6,
        chatgptRequestCount: 1,
        promptTokens: existingSummary.promptTokens + newPromptTokens,
        completionTokens: existingSummary.completionTokens + newCompletionTokens,
        totalTokens: existingSummary.totalTokens + newTotalTokens,
        lastRequestAt: Date.now(),
      };

      await mockContext.db.patch(existingSummary._id, updates);

      expect(mockDb.patch).toHaveBeenCalledWith(
        mockSummaryId,
        expect.objectContaining({
          promptTokens: 6200,
          completionTokens: 650,
          totalTokens: 6850,
        })
      );
    });

    it("should aggregate token counts from multiple ChatGPT requests", async () => {
      const existingSummary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 2,
        successCount: 2,
        errorCount: 0,
        groqRequestCount: 0,
        geminiRequestCount: 0,
        chatgptRequestCount: 2,
        promptTokens: 2400,
        completionTokens: 300,
        totalTokens: 2700,
        lastRequestAt: Date.now() - 10000,
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSummary);

      // Add third ChatGPT request
      const updates = {
        requestCount: 3,
        successCount: 3,
        chatgptRequestCount: 3,
        promptTokens: 3600,
        completionTokens: 450,
        totalTokens: 4050,
        lastRequestAt: Date.now(),
      };

      await mockContext.db.patch(existingSummary._id, updates);

      expect(mockDb.patch).toHaveBeenCalledWith(
        mockSummaryId,
        expect.objectContaining({
          promptTokens: 3600,
          completionTokens: 450,
          totalTokens: 4050,
        })
      );
    });

    it("should handle ChatGPT requests with optional token counts", async () => {
      const existingSummary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 5,
        successCount: 5,
        errorCount: 0,
        groqRequestCount: 5,
        geminiRequestCount: 0,
        chatgptRequestCount: 0,
        promptTokens: 5000,
        completionTokens: 500,
        totalTokens: 5500,
        lastRequestAt: Date.now() - 10000,
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSummary);

      // Simulate ChatGPT request without token counts (error case)
      const updates = {
        requestCount: 6,
        errorCount: 1,
        chatgptRequestCount: 1,
        promptTokens: 5000, // No change
        completionTokens: 500, // No change
        totalTokens: 5500, // No change
        lastRequestAt: Date.now(),
      };

      await mockContext.db.patch(existingSummary._id, updates);

      expect(mockDb.patch).toHaveBeenCalledWith(
        mockSummaryId,
        expect.objectContaining({
          promptTokens: 5000,
          completionTokens: 500,
          totalTokens: 5500,
        })
      );
    });

    it("should aggregate tokens from mixed providers correctly", async () => {
      const existingSummary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 10,
        successCount: 10,
        errorCount: 0,
        groqRequestCount: 5,
        geminiRequestCount: 3,
        chatgptRequestCount: 2,
        promptTokens: 10000,
        completionTokens: 1000,
        totalTokens: 11000,
        lastRequestAt: Date.now() - 10000,
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSummary);

      // Add another ChatGPT request
      const updates = {
        requestCount: 11,
        successCount: 11,
        chatgptRequestCount: 3,
        promptTokens: 11200,
        completionTokens: 1150,
        totalTokens: 12350,
        lastRequestAt: Date.now(),
      };

      await mockContext.db.patch(existingSummary._id, updates);

      expect(mockDb.patch).toHaveBeenCalledWith(
        mockSummaryId,
        expect.objectContaining({
          promptTokens: 11200,
          completionTokens: 1150,
          totalTokens: 12350,
        })
      );
    });
  });

  describe("Error Event Recording", () => {
    it("should record ChatGPT error events with error messages", async () => {
      const errorEventData = {
        userId: mockUserId,
        provider: "chatgpt" as const,
        model: "gpt-4o",
        requestSource: "live_camera" as const,
        status: "error" as const,
        latencyMs: 500,
        errorMessage: "ChatGPT API error: 401 - Unauthorized",
        timestamp: Date.now(),
      };

      await mockContext.db.insert("usageEvents", errorEventData);

      expect(mockDb.insert).toHaveBeenCalledWith(
        "usageEvents",
        expect.objectContaining({
          status: "error",
          errorMessage: "ChatGPT API error: 401 - Unauthorized",
        })
      );
    });

    it("should record ChatGPT rate limit errors", async () => {
      const errorEventData = {
        userId: mockUserId,
        provider: "chatgpt" as const,
        model: "gpt-4o",
        requestSource: "uploaded_image" as const,
        status: "error" as const,
        latencyMs: 300,
        errorMessage: "ChatGPT API error: 429 - Rate limit exceeded",
        timestamp: Date.now(),
      };

      await mockContext.db.insert("usageEvents", errorEventData);

      expect(mockDb.insert).toHaveBeenCalledWith(
        "usageEvents",
        expect.objectContaining({
          status: "error",
          errorMessage: "ChatGPT API error: 429 - Rate limit exceeded",
        })
      );
    });

    it("should record ChatGPT API key errors", async () => {
      const errorEventData = {
        userId: mockUserId,
        provider: "chatgpt" as const,
        model: "gpt-4o",
        requestSource: "live_camera" as const,
        status: "error" as const,
        latencyMs: 50,
        errorMessage: "OPENAI_API_KEY environment variable is not set",
        timestamp: Date.now(),
      };

      await mockContext.db.insert("usageEvents", errorEventData);

      expect(mockDb.insert).toHaveBeenCalledWith(
        "usageEvents",
        expect.objectContaining({
          status: "error",
          errorMessage: "OPENAI_API_KEY environment variable is not set",
        })
      );
    });

    it("should record ChatGPT parsing errors", async () => {
      const errorEventData = {
        userId: mockUserId,
        provider: "chatgpt" as const,
        model: "gpt-4o",
        requestSource: "uploaded_video" as const,
        status: "error" as const,
        latencyMs: 2000,
        errorMessage: "ChatGPT returned an empty response",
        timestamp: Date.now(),
      };

      await mockContext.db.insert("usageEvents", errorEventData);

      expect(mockDb.insert).toHaveBeenCalledWith(
        "usageEvents",
        expect.objectContaining({
          status: "error",
          errorMessage: "ChatGPT returned an empty response",
        })
      );
    });

    it("should increment errorCount for ChatGPT errors", async () => {
      const existingSummary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 10,
        successCount: 9,
        errorCount: 1,
        groqRequestCount: 5,
        geminiRequestCount: 3,
        chatgptRequestCount: 2,
        promptTokens: 10000,
        completionTokens: 1000,
        totalTokens: 11000,
        lastRequestAt: Date.now() - 10000,
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSummary);

      // Simulate ChatGPT error
      const updates = {
        requestCount: 11,
        successCount: 9, // No change
        errorCount: 2,
        chatgptRequestCount: 3,
        promptTokens: 10000, // No change for error
        completionTokens: 1000, // No change for error
        totalTokens: 11000, // No change for error
        lastRequestAt: Date.now(),
      };

      await mockContext.db.patch(existingSummary._id, updates);

      expect(mockDb.patch).toHaveBeenCalledWith(
        mockSummaryId,
        expect.objectContaining({
          errorCount: 2,
          chatgptRequestCount: 3,
        })
      );
    });

    it("should record error events without token counts", async () => {
      const errorEventData = {
        userId: mockUserId,
        provider: "chatgpt" as const,
        model: "gpt-4o",
        requestSource: "live_camera" as const,
        status: "error" as const,
        latencyMs: 500,
        errorMessage: "Network error",
        timestamp: Date.now(),
      };

      await mockContext.db.insert("usageEvents", errorEventData);

      const insertCall = vi.mocked(mockDb.insert).mock.calls[0];
      const insertedData = insertCall[1];

      expect(insertedData).not.toHaveProperty("promptTokens");
      expect(insertedData).not.toHaveProperty("completionTokens");
      expect(insertedData).not.toHaveProperty("totalTokens");
      expect(insertedData).toHaveProperty("errorMessage");
    });
  });

  describe("Summary Statistics", () => {
    it("should track ChatGPT requests separately from other providers", async () => {
      const summary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 15,
        successCount: 14,
        errorCount: 1,
        groqRequestCount: 8,
        geminiRequestCount: 4,
        chatgptRequestCount: 3,
        promptTokens: 15000,
        completionTokens: 1500,
        totalTokens: 16500,
        lastRequestAt: Date.now(),
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(summary);

      const result = await mockContext.db
        .query("usageSummaries")
        .withIndex("by_user", (q: any) => q.eq("userId", mockUserId))
        .unique();

      expect(result).toEqual(summary);
      expect(result?.chatgptRequestCount).toBe(3);
      expect(result?.groqRequestCount).toBe(8);
      expect(result?.geminiRequestCount).toBe(4);
      expect(result?.requestCount).toBe(15);
    });

    it("should verify total request count equals sum of provider counts", async () => {
      const summary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 15,
        successCount: 14,
        errorCount: 1,
        groqRequestCount: 8,
        geminiRequestCount: 4,
        chatgptRequestCount: 3,
        promptTokens: 15000,
        completionTokens: 1500,
        totalTokens: 16500,
        lastRequestAt: Date.now(),
      };

      const totalProviderRequests =
        summary.groqRequestCount +
        summary.geminiRequestCount +
        summary.chatgptRequestCount;

      expect(totalProviderRequests).toBe(summary.requestCount);
    });

    it("should update lastRequestAt timestamp for ChatGPT requests", async () => {
      const existingSummary: MockUsageSummary = {
        _id: mockSummaryId,
        userId: mockUserId,
        requestCount: 5,
        successCount: 5,
        errorCount: 0,
        groqRequestCount: 5,
        geminiRequestCount: 0,
        chatgptRequestCount: 0,
        promptTokens: 5000,
        completionTokens: 500,
        totalTokens: 5500,
        lastRequestAt: Date.now() - 10000,
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSummary);

      const newTimestamp = Date.now();
      const updates = {
        requestCount: 6,
        successCount: 6,
        chatgptRequestCount: 1,
        promptTokens: 6200,
        completionTokens: 650,
        totalTokens: 6850,
        lastRequestAt: newTimestamp,
      };

      await mockContext.db.patch(existingSummary._id, updates);

      expect(mockDb.patch).toHaveBeenCalledWith(
        mockSummaryId,
        expect.objectContaining({
          lastRequestAt: newTimestamp,
        })
      );
      expect(updates.lastRequestAt).toBeGreaterThan(existingSummary.lastRequestAt);
    });
  });
});
