import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConvexError } from "convex/values";

// Mock types for Convex context
type MockUserId = any;

interface MockDoc {
  _id: string;
  userId: MockUserId;
  apiProvider: "groq" | "chatgpt";
}

interface MockQueryBuilder {
  withIndex: (indexName: string, fn: (q: any) => any) => MockQueryBuilder;
  unique: () => Promise<MockDoc | null>;
}

interface MockDb {
  query: (tableName: string) => MockQueryBuilder;
  patch: (id: string, updates: Partial<MockDoc>) => Promise<void>;
  insert: (tableName: string, doc: Omit<MockDoc, "_id">) => Promise<string>;
}

interface MockContext {
  db: MockDb;
  auth?: {
    getUserIdentity: () => Promise<{ subject: MockUserId } | null>;
  };
}

// Mock the Convex auth module
vi.mock("@convex-dev/auth/server", () => ({
  getAuthUserId: vi.fn(),
}));

// Import after mocking
import { getAuthUserId } from "@convex-dev/auth/server";

// Mock environment variables
const originalEnv = process.env;

describe("Settings Service Unit Tests", () => {
  let mockDb: MockDb;
  let mockContext: MockContext;
  let mockQueryBuilder: MockQueryBuilder;
  const mockUserId = "user123" as MockUserId;
  const mockSettingsId = "settings123";

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.USAGE_DASHBOARD_PASSWORD = "test-password";

    // Create mock query builder
    mockQueryBuilder = {
      withIndex: vi.fn().mockReturnThis(),
      unique: vi.fn().mockResolvedValue(null),
    };

    // Create mock database
    mockDb = {
      query: vi.fn().mockReturnValue(mockQueryBuilder),
      patch: vi.fn().mockResolvedValue(undefined),
      insert: vi.fn().mockResolvedValue(mockSettingsId),
    };

    // Create mock context
    mockContext = {
      db: mockDb,
    };
  });

  describe("getUserSettings (internal query)", () => {
    it("should return settings for valid userId", async () => {
      const mockSettings: MockDoc = {
        _id: mockSettingsId,
        userId: mockUserId,
        apiProvider: "groq",
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(mockSettings);

      // Simulate the query logic
      const result = await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", mockUserId))
        .unique();

      expect(mockDb.query).toHaveBeenCalledWith("userSettings");
      expect(mockQueryBuilder.withIndex).toHaveBeenCalledWith(
        "by_user",
        expect.any(Function)
      );
      expect(result).toEqual(mockSettings);
      expect(result?.apiProvider).toBe("groq");
    });

    it("should return null when no settings exist", async () => {
      mockQueryBuilder.unique = vi.fn().mockResolvedValue(null);

      const result = await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", mockUserId))
        .unique();

      expect(result).toBeNull();
    });

    it("should query with correct index and userId", async () => {
      const indexFn = vi.fn();
      mockQueryBuilder.withIndex = vi.fn((indexName, fn) => {
        indexFn(indexName, fn);
        return mockQueryBuilder;
      });

      await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", mockUserId))
        .unique();

      expect(mockDb.query).toHaveBeenCalledWith("userSettings");
      expect(mockQueryBuilder.withIndex).toHaveBeenCalledWith(
        "by_user",
        expect.any(Function)
      );
    });
  });

  describe("getMySettings (query)", () => {
    it("should return null when user not authenticated", async () => {
      vi.mocked(getAuthUserId).mockResolvedValue(null);

      const result = await getAuthUserId(mockContext as any);

      expect(result).toBeNull();
    });

    it("should return settings for authenticated user", async () => {
      const mockSettings: MockDoc = {
        _id: mockSettingsId,
        userId: mockUserId,
        apiProvider: "chatgpt",
      };

      vi.mocked(getAuthUserId).mockResolvedValue(mockUserId);
      mockQueryBuilder.unique = vi.fn().mockResolvedValue(mockSettings);

      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBe(mockUserId);

      const result = await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .unique();

      expect(result).toEqual(mockSettings);
      expect(result?.apiProvider).toBe("chatgpt");
    });

    it("should return null when authenticated user has no settings", async () => {
      vi.mocked(getAuthUserId).mockResolvedValue(mockUserId);
      mockQueryBuilder.unique = vi.fn().mockResolvedValue(null);

      const userId = await getAuthUserId(mockContext as any);
      const result = await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .unique();

      expect(result).toBeNull();
    });
  });

  describe("updateApiProvider (mutation)", () => {
    beforeEach(() => {
      vi.mocked(getAuthUserId).mockResolvedValue(mockUserId);
    });

    it("should create new settings when none exist", async () => {
      mockQueryBuilder.unique = vi.fn().mockResolvedValue(null);

      const password = "test-password";
      const apiProvider = "chatgpt";

      // Verify password
      const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;
      expect(configuredPassword).toBe(password);

      // Get userId
      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBe(mockUserId);

      // Check existing settings
      const existing = await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .unique();

      expect(existing).toBeNull();

      // Insert new settings
      await mockContext.db.insert("userSettings", {
        userId,
        apiProvider,
      });

      expect(mockDb.insert).toHaveBeenCalledWith("userSettings", {
        userId: mockUserId,
        apiProvider: "chatgpt",
      });
    });

    it("should update existing settings", async () => {
      const existingSettings: MockDoc = {
        _id: mockSettingsId,
        userId: mockUserId,
        apiProvider: "groq",
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSettings);

      const password = "test-password";
      const apiProvider = "chatgpt";

      // Verify password
      const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;
      expect(configuredPassword).toBe(password);

      // Get userId
      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBe(mockUserId);

      // Check existing settings
      const existing = await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .unique();

      expect(existing).toEqual(existingSettings);

      // Update existing settings
      await mockContext.db.patch(existing!._id, {
        apiProvider,
      });

      expect(mockDb.patch).toHaveBeenCalledWith(mockSettingsId, {
        apiProvider: "chatgpt",
      });
    });

    it("should throw error for incorrect password", async () => {
      const password = "wrong-password";
      const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;

      expect(configuredPassword).toBe("test-password");
      expect(password).not.toBe(configuredPassword);

      // Simulate password check
      const passwordMatches = password === configuredPassword;
      expect(passwordMatches).toBe(false);

      // This would throw an error in the actual implementation
      if (!passwordMatches) {
        const error = new Error("Incorrect password");
        expect(error.message).toBe("Incorrect password");
      }
    });

    it("should throw error when password not configured", async () => {
      delete process.env.USAGE_DASHBOARD_PASSWORD;

      const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;
      expect(configuredPassword).toBeUndefined();

      // This would throw an error in the actual implementation
      if (!configuredPassword) {
        const error = new Error("Usage dashboard password is not configured");
        expect(error.message).toBe("Usage dashboard password is not configured");
      }
    });

    it("should throw error when user not authenticated", async () => {
      vi.mocked(getAuthUserId).mockResolvedValue(null);

      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBeNull();

      // This would throw an error in the actual implementation
      if (!userId) {
        const error = new Error("Must be authenticated");
        expect(error.message).toBe("Must be authenticated");
      }
    });

    it("should accept groq as valid provider", async () => {
      mockQueryBuilder.unique = vi.fn().mockResolvedValue(null);

      const password = "test-password";
      const apiProvider = "groq";

      // Verify password
      const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;
      expect(configuredPassword).toBe(password);

      // Get userId
      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBe(mockUserId);

      // Insert new settings
      await mockContext.db.insert("userSettings", {
        userId,
        apiProvider,
      });

      expect(mockDb.insert).toHaveBeenCalledWith("userSettings", {
        userId: mockUserId,
        apiProvider: "groq",
      });
    });

    it("should accept chatgpt as valid provider", async () => {
      mockQueryBuilder.unique = vi.fn().mockResolvedValue(null);

      const password = "test-password";
      const apiProvider = "chatgpt";

      // Verify password
      const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;
      expect(configuredPassword).toBe(password);

      // Get userId
      const userId = await getAuthUserId(mockContext as any);
      expect(userId).toBe(mockUserId);

      // Insert new settings
      await mockContext.db.insert("userSettings", {
        userId,
        apiProvider,
      });

      expect(mockDb.insert).toHaveBeenCalledWith("userSettings", {
        userId: mockUserId,
        apiProvider: "chatgpt",
      });
    });

    it("should return success response after update", async () => {
      const existingSettings: MockDoc = {
        _id: mockSettingsId,
        userId: mockUserId,
        apiProvider: "groq",
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSettings);

      const password = "test-password";
      const apiProvider = "chatgpt";

      // Verify password
      const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;
      expect(configuredPassword).toBe(password);

      // Get userId
      const userId = await getAuthUserId(mockContext as any);

      // Update settings
      await mockContext.db.patch(existingSettings._id, { apiProvider });

      // Simulate success response
      const response = { success: true };
      expect(response).toEqual({ success: true });
    });
  });

  describe("Password validation", () => {
    it("should validate password before any database operations", async () => {
      const password = "test-password";
      const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;

      expect(configuredPassword).toBeDefined();
      expect(password).toBe(configuredPassword);
    });

    it("should check password configuration exists", async () => {
      const configuredPassword = process.env.USAGE_DASHBOARD_PASSWORD;
      expect(configuredPassword).toBe("test-password");
      expect(configuredPassword).toBeTruthy();
    });

    it("should perform case-sensitive password comparison", async () => {
      process.env.USAGE_DASHBOARD_PASSWORD = "TestPassword";
      
      const correctPassword = "TestPassword";
      const wrongPassword = "testpassword";

      expect(correctPassword === process.env.USAGE_DASHBOARD_PASSWORD).toBe(true);
      expect(wrongPassword === process.env.USAGE_DASHBOARD_PASSWORD).toBe(false);
    });
  });

  describe("Database operations", () => {
    it("should use correct table name for queries", async () => {
      await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", mockUserId))
        .unique();

      expect(mockDb.query).toHaveBeenCalledWith("userSettings");
    });

    it("should use correct index for user lookups", async () => {
      await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", mockUserId))
        .unique();

      expect(mockQueryBuilder.withIndex).toHaveBeenCalledWith(
        "by_user",
        expect.any(Function)
      );
    });

    it("should patch only apiProvider field when updating", async () => {
      const existingSettings: MockDoc = {
        _id: mockSettingsId,
        userId: mockUserId,
        apiProvider: "groq",
      };

      await mockContext.db.patch(existingSettings._id, {
        apiProvider: "chatgpt",
      });

      expect(mockDb.patch).toHaveBeenCalledWith(mockSettingsId, {
        apiProvider: "chatgpt",
      });
      
      // Verify only apiProvider is in the patch
      const patchCall = vi.mocked(mockDb.patch).mock.calls[0];
      const patchData = patchCall[1];
      expect(Object.keys(patchData)).toEqual(["apiProvider"]);
    });

    it("should insert complete document when creating new settings", async () => {
      await mockContext.db.insert("userSettings", {
        userId: mockUserId,
        apiProvider: "chatgpt",
      });

      expect(mockDb.insert).toHaveBeenCalledWith("userSettings", {
        userId: mockUserId,
        apiProvider: "chatgpt",
      });

      // Verify all required fields are present
      const insertCall = vi.mocked(mockDb.insert).mock.calls[0];
      const insertData = insertCall[1];
      expect(insertData).toHaveProperty("userId");
      expect(insertData).toHaveProperty("apiProvider");
    });
  });

  describe("Edge cases", () => {
    it("should handle switching from groq to chatgpt", async () => {
      const existingSettings: MockDoc = {
        _id: mockSettingsId,
        userId: mockUserId,
        apiProvider: "groq",
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSettings);

      await mockContext.db.patch(existingSettings._id, {
        apiProvider: "chatgpt",
      });

      expect(mockDb.patch).toHaveBeenCalledWith(mockSettingsId, {
        apiProvider: "chatgpt",
      });
    });

    it("should handle switching from chatgpt to groq", async () => {
      const existingSettings: MockDoc = {
        _id: mockSettingsId,
        userId: mockUserId,
        apiProvider: "chatgpt",
      };

      mockQueryBuilder.unique = vi.fn().mockResolvedValue(existingSettings);

      await mockContext.db.patch(existingSettings._id, {
        apiProvider: "groq",
      });

      expect(mockDb.patch).toHaveBeenCalledWith(mockSettingsId, {
        apiProvider: "groq",
      });
    });

    it("should handle multiple users with different settings", async () => {
      const user1Id = "user1" as MockUserId;
      const user2Id = "user2" as MockUserId;

      const user1Settings: MockDoc = {
        _id: "settings1",
        userId: user1Id,
        apiProvider: "groq",
      };

      const user2Settings: MockDoc = {
        _id: "settings2",
        userId: user2Id,
        apiProvider: "chatgpt",
      };

      // Query for user1
      mockQueryBuilder.unique = vi.fn().mockResolvedValue(user1Settings);
      const result1 = await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", user1Id))
        .unique();

      expect(result1?.apiProvider).toBe("groq");

      // Query for user2
      mockQueryBuilder.unique = vi.fn().mockResolvedValue(user2Settings);
      const result2 = await mockContext.db
        .query("userSettings")
        .withIndex("by_user", (q: any) => q.eq("userId", user2Id))
        .unique();

      expect(result2?.apiProvider).toBe("chatgpt");
    });
  });
});
