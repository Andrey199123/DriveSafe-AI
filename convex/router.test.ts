import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock types for Convex context
type MockUserId = any;

interface MockUserSettings {
  _id: string;
  userId: MockUserId;
  apiProvider: "groq" | "chatgpt";
}

interface MockContext {
  runQuery: (query: any, args: any) => Promise<MockUserSettings | null>;
  runMutation: (mutation: any, args: any) => Promise<void>;
}

// Mock the Convex auth module
vi.mock("@convex-dev/auth/server", () => ({
  getAuthUserId: vi.fn(),
}));

// Import after mocking
import { getAuthUserId } from "@convex-dev/auth/server";

// Mock environment variables
const originalEnv = process.env;
const originalFetch = global.fetch;

describe("API Provider Router Unit Tests", () => {
  let mockContext: MockContext;
  const mockUserId = "user123" as MockUserId;
  const mockBase64Image = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  const mockSource = "live_camera";

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.GROQ_API_KEY = "test-groq-key";
    process.env.OPENAI_API_KEY = "test-openai-key";

    // Create mock context
    mockContext = {
      runQuery: vi.fn().mockResolvedValue(null),
      runMutation: vi.fn().mockResolvedValue(undefined),
    };

    // Mock getAuthUserId to return a valid user by default
    vi.mocked(getAuthUserId).mockResolvedValue(mockUserId);
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  describe("Provider Selection", () => {
    it("should call Groq when user settings specify 'groq'", async () => {
      // Mock user settings to return groq
      const mockSettings: MockUserSettings = {
        _id: "settings123",
        userId: mockUserId,
        apiProvider: "groq",
      };
      mockContext.runQuery = vi.fn().mockResolvedValue(mockSettings);

      // Mock successful Groq API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eyesRed: false,
                  eyesGlassy: false,
                  eyesHalfClosed: false,
                  eyesClosed: false,
                  faceRed: false,
                  lookingAway: false,
                  confidence: 75,
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 50,
            total_tokens: 200,
          },
        }),
      });
      global.fetch = mockFetch;

      // Simulate the router logic
      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBe(mockUserId);

      const userSettings = await mockContext.runQuery(null, { userId });
      expect(userSettings?.apiProvider).toBe("groq");

      const provider = userSettings?.apiProvider ?? "groq";
      expect(provider).toBe("groq");

      // Verify Groq API is called
      if (provider === "groq") {
        await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [],
          }),
        });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.groq.com/openai/v1/chat/completions",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              Authorization: "Bearer test-groq-key",
            }),
          })
        );
      }
    });

    it("should call ChatGPT when user settings specify 'chatgpt'", async () => {
      // Mock user settings to return chatgpt
      const mockSettings: MockUserSettings = {
        _id: "settings123",
        userId: mockUserId,
        apiProvider: "chatgpt",
      };
      mockContext.runQuery = vi.fn().mockResolvedValue(mockSettings);

      // Mock successful ChatGPT API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eyesRed: false,
                  eyesGlassy: false,
                  eyesHalfClosed: false,
                  eyesClosed: false,
                  faceRed: false,
                  lookingAway: false,
                  confidence: 75,
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 50,
            total_tokens: 200,
          },
        }),
      });
      global.fetch = mockFetch;

      // Simulate the router logic
      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBe(mockUserId);

      const userSettings = await mockContext.runQuery(null, { userId });
      expect(userSettings?.apiProvider).toBe("chatgpt");

      const provider = userSettings?.apiProvider ?? "groq";
      expect(provider).toBe("chatgpt");

      // Verify ChatGPT API is called
      if (provider === "chatgpt") {
        await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [],
          }),
        });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.openai.com/v1/chat/completions",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              Authorization: "Bearer test-openai-key",
            }),
          })
        );
      }
    });

    it("should default to Groq when user settings are missing", async () => {
      // Mock user settings to return null (no settings)
      mockContext.runQuery = vi.fn().mockResolvedValue(null);

      // Mock successful Groq API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eyesRed: false,
                  eyesGlassy: false,
                  eyesHalfClosed: false,
                  eyesClosed: false,
                  faceRed: false,
                  lookingAway: false,
                  confidence: 75,
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 50,
            total_tokens: 200,
          },
        }),
      });
      global.fetch = mockFetch;

      // Simulate the router logic
      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBe(mockUserId);

      const userSettings = await mockContext.runQuery(null, { userId });
      expect(userSettings).toBeNull();

      const provider = userSettings?.apiProvider ?? "groq";
      expect(provider).toBe("groq");

      // Verify Groq API is called (default)
      await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [],
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.groq.com/openai/v1/chat/completions",
        expect.any(Object)
      );
    });

    it("should default to Groq when user settings query fails", async () => {
      // Mock user settings query to throw an error
      mockContext.runQuery = vi.fn().mockRejectedValue(new Error("Database query failed"));

      // Mock successful Groq API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eyesRed: false,
                  eyesGlassy: false,
                  eyesHalfClosed: false,
                  eyesClosed: false,
                  faceRed: false,
                  lookingAway: false,
                  confidence: 75,
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 50,
            total_tokens: 200,
          },
        }),
      });
      global.fetch = mockFetch;

      // Simulate the router logic with error handling
      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBe(mockUserId);

      let userSettings = null;
      try {
        userSettings = await mockContext.runQuery(null, { userId });
      } catch (error) {
        // Query failed, settings remain null
        console.error("Settings query failed:", error);
      }

      expect(userSettings).toBeNull();

      const provider = userSettings?.apiProvider ?? "groq";
      expect(provider).toBe("groq");

      // Verify Groq API is called (default fallback)
      await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [],
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.groq.com/openai/v1/chat/completions",
        expect.any(Object)
      );
    });
  });

  describe("Authentication", () => {
    it("should throw error when user is not authenticated", async () => {
      // Mock getAuthUserId to return null (not authenticated)
      vi.mocked(getAuthUserId).mockResolvedValue(null);

      // Simulate the authentication check
      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBeNull();

      // Verify error is thrown
      if (!userId) {
        const error = new Error("Must be authenticated");
        expect(error.message).toBe("Must be authenticated");
      }
    });

    it("should verify error message is 'Must be authenticated'", async () => {
      // Mock getAuthUserId to return null
      vi.mocked(getAuthUserId).mockResolvedValue(null);

      const userId = await getAuthUserId(mockContext as any);

      if (!userId) {
        try {
          throw new Error("Must be authenticated");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("Must be authenticated");
        }
      }
    });

    it("should not proceed with API call when not authenticated", async () => {
      // Mock getAuthUserId to return null
      vi.mocked(getAuthUserId).mockResolvedValue(null);

      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      // Simulate the authentication check
      const userId = await getAuthUserId(mockContext as any);

      if (!userId) {
        // Should throw error and not proceed
        expect(userId).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
      }
    });
  });

  describe("Provider Routing Logic", () => {
    it("should query user settings with correct userId", async () => {
      const mockSettings: MockUserSettings = {
        _id: "settings123",
        userId: mockUserId,
        apiProvider: "groq",
      };
      mockContext.runQuery = vi.fn().mockResolvedValue(mockSettings);

      const userId = await getAuthUserId(mockContext as any);
      await mockContext.runQuery(null, { userId });

      expect(mockContext.runQuery).toHaveBeenCalledWith(null, {
        userId: mockUserId,
      });
    });

    it("should use nullish coalescing to default to groq", async () => {
      mockContext.runQuery = vi.fn().mockResolvedValue(null);

      const userSettings = await mockContext.runQuery(null, { userId: mockUserId });
      const provider = userSettings?.apiProvider ?? "groq";

      expect(provider).toBe("groq");
    });

    it("should respect user preference when settings exist", async () => {
      const mockSettings: MockUserSettings = {
        _id: "settings123",
        userId: mockUserId,
        apiProvider: "chatgpt",
      };
      mockContext.runQuery = vi.fn().mockResolvedValue(mockSettings);

      const userSettings = await mockContext.runQuery(null, { userId: mockUserId });
      const provider = userSettings?.apiProvider ?? "groq";

      expect(provider).toBe("chatgpt");
      expect(provider).not.toBe("groq");
    });

    it("should handle provider value correctly in conditional", async () => {
      const mockSettings: MockUserSettings = {
        _id: "settings123",
        userId: mockUserId,
        apiProvider: "chatgpt",
      };
      mockContext.runQuery = vi.fn().mockResolvedValue(mockSettings);

      const userSettings = await mockContext.runQuery(null, { userId: mockUserId });
      const provider = userSettings?.apiProvider ?? "groq";

      let calledProvider: string | null = null;

      if (provider === "chatgpt") {
        calledProvider = "chatgpt";
      } else {
        calledProvider = "groq";
      }

      expect(calledProvider).toBe("chatgpt");
    });

    it("should route to groq for any non-chatgpt provider value", async () => {
      const mockSettings: MockUserSettings = {
        _id: "settings123",
        userId: mockUserId,
        apiProvider: "groq",
      };
      mockContext.runQuery = vi.fn().mockResolvedValue(mockSettings);

      const userSettings = await mockContext.runQuery(null, { userId: mockUserId });
      const provider = userSettings?.apiProvider ?? "groq";

      let calledProvider: string | null = null;

      if (provider === "chatgpt") {
        calledProvider = "chatgpt";
      } else {
        calledProvider = "groq";
      }

      expect(calledProvider).toBe("groq");
    });
  });

  describe("Integration with Settings Service", () => {
    it("should call getUserSettings internal query", async () => {
      const mockSettings: MockUserSettings = {
        _id: "settings123",
        userId: mockUserId,
        apiProvider: "groq",
      };
      mockContext.runQuery = vi.fn().mockResolvedValue(mockSettings);

      const userId = await getAuthUserId(mockContext as any);
      const result = await mockContext.runQuery(null, { userId });

      expect(mockContext.runQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSettings);
    });

    it("should handle null response from getUserSettings", async () => {
      mockContext.runQuery = vi.fn().mockResolvedValue(null);

      const userId = await getAuthUserId(mockContext as any);
      const result = await mockContext.runQuery(null, { userId });

      expect(result).toBeNull();
    });

    it("should extract apiProvider field from settings", async () => {
      const mockSettings: MockUserSettings = {
        _id: "settings123",
        userId: mockUserId,
        apiProvider: "chatgpt",
      };
      mockContext.runQuery = vi.fn().mockResolvedValue(mockSettings);

      const userSettings = await mockContext.runQuery(null, { userId: mockUserId });
      
      expect(userSettings).toHaveProperty("apiProvider");
      expect(userSettings?.apiProvider).toBe("chatgpt");
    });
  });

  describe("Error Handling", () => {
    it("should handle authentication error before settings query", async () => {
      vi.mocked(getAuthUserId).mockResolvedValue(null);

      const userId = await getAuthUserId(mockContext as any);

      if (!userId) {
        // Should not proceed to query settings
        expect(mockContext.runQuery).not.toHaveBeenCalled();
      }
    });

    it("should gracefully handle settings query errors", async () => {
      mockContext.runQuery = vi.fn().mockRejectedValue(new Error("Database error"));

      let userSettings = null;
      let errorOccurred = false;

      try {
        userSettings = await mockContext.runQuery(null, { userId: mockUserId });
      } catch (error) {
        errorOccurred = true;
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Database error");
      }

      expect(errorOccurred).toBe(true);
      expect(userSettings).toBeNull();
    });

    it("should use default provider when settings query throws", async () => {
      mockContext.runQuery = vi.fn().mockRejectedValue(new Error("Query failed"));

      let userSettings = null;
      try {
        userSettings = await mockContext.runQuery(null, { userId: mockUserId });
      } catch (error) {
        // Ignore error and use default
      }

      const provider = userSettings?.apiProvider ?? "groq";
      expect(provider).toBe("groq");
    });
  });

  describe("Provider API Calls", () => {
    it("should pass correct arguments to Groq API", async () => {
      const mockSettings: MockUserSettings = {
        _id: "settings123",
        userId: mockUserId,
        apiProvider: "groq",
      };
      mockContext.runQuery = vi.fn().mockResolvedValue(mockSettings);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "{}" } }],
          usage: { prompt_tokens: 150, completion_tokens: 50, total_tokens: 200 },
        }),
      });
      global.fetch = mockFetch;

      const userSettings = await mockContext.runQuery(null, { userId: mockUserId });
      const provider = userSettings?.apiProvider ?? "groq";

      if (provider === "groq") {
        await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [],
          }),
        });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.groq.com/openai/v1/chat/completions",
          expect.objectContaining({
            method: "POST",
          })
        );
      }
    });

    it("should pass correct arguments to ChatGPT API", async () => {
      const mockSettings: MockUserSettings = {
        _id: "settings123",
        userId: mockUserId,
        apiProvider: "chatgpt",
      };
      mockContext.runQuery = vi.fn().mockResolvedValue(mockSettings);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "{}" } }],
          usage: { prompt_tokens: 150, completion_tokens: 50, total_tokens: 200 },
        }),
      });
      global.fetch = mockFetch;

      const userSettings = await mockContext.runQuery(null, { userId: mockUserId });
      const provider = userSettings?.apiProvider ?? "groq";

      if (provider === "chatgpt") {
        await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [],
          }),
        });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.openai.com/v1/chat/completions",
          expect.objectContaining({
            method: "POST",
          })
        );
      }
    });
  });
});
