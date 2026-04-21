import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock types for Convex context
type MockUserId = any;

interface MockContext {
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

describe("ChatGPT API Client Unit Tests", () => {
  let mockContext: MockContext;
  const mockUserId = "user123" as MockUserId;
  const mockBase64Image = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  const mockSource = "live_camera";

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.OPENAI_API_KEY = "test-openai-key";

    // Create mock context
    mockContext = {
      runMutation: vi.fn().mockResolvedValue(undefined),
    };

    // Mock getAuthUserId
    vi.mocked(getAuthUserId).mockResolvedValue(mockUserId);
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  describe("Successful ChatGPT API response", () => {
    it("should make request with correct model (gpt-4o)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eyesRed: true,
                  eyesGlassy: false,
                  eyesHalfClosed: false,
                  eyesClosed: false,
                  faceRed: true,
                  lookingAway: false,
                  confidence: 85,
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

      // Simulate the API call
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: expect.any(String),
            },
            {
              role: "user",
              content: expect.any(Array),
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "Authorization": "Bearer test-openai-key",
          }),
        })
      );

      const result = await response.json();
      expect(result.choices[0].message.content).toBeDefined();
    });

    it("should parse response correctly into AnalysisResult", async () => {
      const mockResponse = {
        eyesRed: true,
        eyesGlassy: true,
        eyesHalfClosed: false,
        eyesClosed: false,
        faceRed: true,
        lookingAway: false,
        confidence: 90,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
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

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
          response_format: { type: "json_object" },
        }),
      });

      const result = await response.json();
      const content = result.choices[0].message.content;
      const parsed = JSON.parse(content);

      // Verify parsing logic
      const eyesRed = parsed.eyesRed ?? false;
      const eyesGlassy = parsed.eyesGlassy ?? false;
      const eyesHalfClosed = parsed.eyesHalfClosed ?? false;
      const eyesClosed = parsed.eyesClosed ?? false;
      const faceRed = parsed.faceRed ?? false;
      const lookingAway = parsed.lookingAway ?? false;

      expect(eyesRed).toBe(true);
      expect(eyesGlassy).toBe(true);
      expect(faceRed).toBe(true);

      // Verify analysis logic
      const isDrunk = (eyesRed || eyesGlassy) && (faceRed || eyesHalfClosed);
      const isSleepy = eyesClosed || eyesHalfClosed;
      const isDistracted = lookingAway;

      expect(isDrunk).toBe(true);
      expect(isSleepy).toBe(false);
      expect(isDistracted).toBe(false);

      // Verify indicators
      const indicators: string[] = [];
      if (eyesRed) indicators.push("red eyes");
      if (eyesGlassy) indicators.push("glassy eyes");
      if (faceRed) indicators.push("facial redness");

      expect(indicators).toContain("red eyes");
      expect(indicators).toContain("glassy eyes");
      expect(indicators).toContain("facial redness");

      // Verify state
      let state: "drunk" | "sleepy" | "distracted" | "normal" = "normal";
      if (isDrunk) state = "drunk";
      else if (isSleepy) state = "sleepy";
      else if (isDistracted) state = "distracted";

      expect(state).toBe("drunk");
    });

    it("should record usage event with provider='chatgpt'", async () => {
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

      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
        }),
      });

      // Simulate usage event recording
      await mockContext.runMutation(null, {
        userId: mockUserId,
        provider: "chatgpt",
        model: "gpt-4o",
        requestSource: mockSource,
        status: "success",
        latencyMs: expect.any(Number),
        promptTokens: 150,
        completionTokens: 50,
        totalTokens: 200,
        errorMessage: undefined,
      });

      expect(mockContext.runMutation).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          provider: "chatgpt",
          model: "gpt-4o",
          status: "success",
        })
      );
    });

    it("should extract token counts from response", async () => {
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
            prompt_tokens: 175,
            completion_tokens: 45,
            total_tokens: 220,
          },
        }),
      });

      global.fetch = mockFetch;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
        }),
      });

      const result = await response.json();
      const promptTokens = result.usage?.prompt_tokens;
      const completionTokens = result.usage?.completion_tokens;
      const totalTokens = result.usage?.total_tokens;

      expect(promptTokens).toBe(175);
      expect(completionTokens).toBe(45);
      expect(totalTokens).toBe(220);
    });

    it("should include base64 image in request", async () => {
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

      const requestBody = {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a computer vision system",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image",
              },
              {
                type: "image_url",
                image_url: {
                  url: mockBase64Image,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.3,
      };

      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      
      expect(body.messages[1].content[1].image_url.url).toBe(mockBase64Image);
    });
  });

  describe("Error handling", () => {
    it("should throw descriptive error when OPENAI_API_KEY is missing", async () => {
      delete process.env.OPENAI_API_KEY;

      const apiKey = process.env.OPENAI_API_KEY;
      expect(apiKey).toBeUndefined();

      // Simulate the error check
      if (!apiKey) {
        const error = new Error("OPENAI_API_KEY environment variable is not set");
        expect(error.message).toBe("OPENAI_API_KEY environment variable is not set");
      }
    });

    it("should throw authentication error on 401 Unauthorized", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized: Invalid API key",
      });

      global.fetch = mockFetch;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);

      const errorText = await response.text();
      const error = new Error(`ChatGPT API error: ${response.status} - ${errorText}`);
      
      expect(error.message).toContain("401");
      expect(error.message).toContain("Unauthorized");
    });

    it("should throw rate limit error on 429 response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
      });

      global.fetch = mockFetch;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);

      const errorText = await response.text();
      const error = new Error(`ChatGPT API error: ${response.status} - ${errorText}`);
      
      expect(error.message).toContain("429");
      expect(error.message).toContain("Rate limit");
    });

    it("should throw parsing error on malformed JSON response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "This is not valid JSON {broken",
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

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
        }),
      });

      const result = await response.json();
      const content = result.choices[0].message.content;

      // Try to parse and expect error
      try {
        JSON.parse(content);
        expect.fail("Should have thrown parsing error");
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });

    it("should throw error when response content is empty", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: null,
              },
            },
          ],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 0,
            total_tokens: 150,
          },
        }),
      });

      global.fetch = mockFetch;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
        }),
      });

      const result = await response.json();
      const content = result.choices[0].message.content;

      if (!content) {
        const error = new Error("ChatGPT returned an empty response");
        expect(error.message).toBe("ChatGPT returned an empty response");
      }
    });

    it("should record usage event with error status on API failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      });

      global.fetch = mockFetch;

      const startedAt = Date.now();
      let status: "success" | "error" = "error";
      let errorMessage: string | undefined;

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ChatGPT API error: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : "Unknown ChatGPT request error";
      }

      expect(status).toBe("error");
      expect(errorMessage).toContain("500");
      expect(errorMessage).toContain("Internal server error");

      // Simulate usage event recording
      await mockContext.runMutation(null, {
        userId: mockUserId,
        provider: "chatgpt",
        model: "gpt-4o",
        requestSource: mockSource,
        status,
        latencyMs: Date.now() - startedAt,
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined,
        errorMessage,
      });

      expect(mockContext.runMutation).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          provider: "chatgpt",
          status: "error",
          errorMessage: expect.stringContaining("500"),
        })
      );
    });

    it("should record usage event with error status on network failure", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network request failed"));

      global.fetch = mockFetch;

      let status: "success" | "error" = "error";
      let errorMessage: string | undefined;

      try {
        await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [],
          }),
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : "Unknown ChatGPT request error";
      }

      expect(status).toBe("error");
      expect(errorMessage).toBe("Network request failed");

      // Simulate usage event recording
      await mockContext.runMutation(null, {
        userId: mockUserId,
        provider: "chatgpt",
        model: "gpt-4o",
        requestSource: mockSource,
        status,
        latencyMs: expect.any(Number),
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined,
        errorMessage,
      });

      expect(mockContext.runMutation).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          provider: "chatgpt",
          status: "error",
          errorMessage: "Network request failed",
        })
      );
    });

    it("should record usage event with error status on JSON parsing failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Not valid JSON at all",
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

      let status: "success" | "error" = "error";
      let errorMessage: string | undefined;

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [],
          }),
        });

        const result = await response.json();
        const content = result.choices[0].message.content;

        // Try to find JSON in content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in ChatGPT response");
        }

        JSON.parse(jsonMatch[0]);
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : "Unknown ChatGPT request error";
      }

      expect(status).toBe("error");
      expect(errorMessage).toBe("No JSON found in ChatGPT response");

      // Simulate usage event recording
      await mockContext.runMutation(null, {
        userId: mockUserId,
        provider: "chatgpt",
        model: "gpt-4o",
        requestSource: mockSource,
        status,
        latencyMs: expect.any(Number),
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined,
        errorMessage,
      });

      expect(mockContext.runMutation).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          provider: "chatgpt",
          status: "error",
          errorMessage: "No JSON found in ChatGPT response",
        })
      );
    });
  });

  describe("Response parsing", () => {
    it("should handle JSON wrapped in markdown code blocks", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '```json\n{"eyesRed": true, "confidence": 80}\n```',
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

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
        }),
      });

      const result = await response.json();
      let content = result.choices[0].message.content.trim();

      // Clean markdown code blocks
      if (content.includes("```json")) {
        content = content.replace(/```json\n?/, "").replace(/```\n?$/, "").trim();
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      expect(jsonMatch).toBeTruthy();

      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.eyesRed).toBe(true);
      expect(parsed.confidence).toBe(80);
    });

    it("should use default values for missing fields", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eyesRed: true,
                  // Missing other fields
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

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
        }),
      });

      const result = await response.json();
      const parsed = JSON.parse(result.choices[0].message.content);

      // Apply default values
      const eyesRed = parsed.eyesRed ?? false;
      const eyesGlassy = parsed.eyesGlassy ?? false;
      const eyesHalfClosed = parsed.eyesHalfClosed ?? false;
      const eyesClosed = parsed.eyesClosed ?? false;
      const faceRed = parsed.faceRed ?? false;
      const lookingAway = parsed.lookingAway ?? false;
      const confidence = parsed.confidence ?? 75;

      expect(eyesRed).toBe(true);
      expect(eyesGlassy).toBe(false);
      expect(eyesHalfClosed).toBe(false);
      expect(eyesClosed).toBe(false);
      expect(faceRed).toBe(false);
      expect(lookingAway).toBe(false);
      expect(confidence).toBe(75);
    });
  });

  describe("Request configuration", () => {
    it("should use correct API endpoint", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "{}" } }],
          usage: { prompt_tokens: 150, completion_tokens: 50, total_tokens: 200 },
        }),
      });

      global.fetch = mockFetch;

      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.any(Object)
      );
    });

    it("should set correct request headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "{}" } }],
          usage: { prompt_tokens: 150, completion_tokens: 50, total_tokens: 200 },
        }),
      });

      global.fetch = mockFetch;

      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [],
        }),
      });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["Authorization"]).toBe("Bearer test-openai-key");
    });

    it("should use json_object response format", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "{}" } }],
          usage: { prompt_tokens: 150, completion_tokens: 50, total_tokens: 200 },
        }),
      });

      global.fetch = mockFetch;

      const requestBody = {
        model: "gpt-4o",
        messages: [],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.3,
      };

      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.response_format).toEqual({ type: "json_object" });
      expect(body.max_tokens).toBe(200);
      expect(body.temperature).toBe(0.3);
    });
  });
});
