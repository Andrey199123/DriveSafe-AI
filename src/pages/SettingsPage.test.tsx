import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import SettingsPage from "./SettingsPage";

// Mock Convex hooks
const mockConvexQuery = vi.fn();

vi.mock("convex/react", () => ({
  useConvex: () => ({
    query: mockConvexQuery,
  }),
}));

// Mock Convex API
vi.mock("../../convex/_generated/api", () => ({
  api: {
    usage: {
      getUsageDashboard: "mockGetUsageDashboard",
    },
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Password Form Rendering", () => {
    it("should render the settings page header", () => {
      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Shared usage dashboard")).toBeInTheDocument();
    });

    it("should render password form when dashboard is locked", () => {
      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      expect(screen.getByPlaceholderText("Usage dashboard password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Unlock dashboard/i })).toBeInTheDocument();
    });

    it("should render description text for password form", () => {
      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      expect(
        screen.getByText("Enter the shared password to open the API usage view.")
      ).toBeInTheDocument();
    });
  });

  describe("Password Validation", () => {
    it("should reject empty password submission", async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByPlaceholderText("Usage dashboard password");
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      // Try to submit without entering a password
      await user.click(submitButton);

      // The form should not submit (mockConvexQuery should not be called)
      expect(mockConvexQuery).not.toHaveBeenCalled();

      // Password input should still be visible (form not submitted)
      expect(passwordInput).toBeInTheDocument();
    });

    it("should display error message for incorrect password", async () => {
      const user = userEvent.setup();
      mockConvexQuery.mockRejectedValueOnce(new Error("Incorrect usage dashboard password"));

      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByPlaceholderText("Usage dashboard password");
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      await user.type(passwordInput, "wrongpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Incorrect usage dashboard password")).toBeInTheDocument();
      });
    });

    it("should display loading state while validating password", async () => {
      const user = userEvent.setup();
      mockConvexQuery.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByPlaceholderText("Usage dashboard password");
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      await user.type(passwordInput, "testpassword");
      await user.click(submitButton);

      expect(screen.getByRole("button", { name: /Unlocking dashboard/i })).toBeInTheDocument();
    });

    it("should display dashboard when correct password is entered", async () => {
      const user = userEvent.setup();
      const mockDashboard = {
        totals: {
          requestCount: 100,
          successCount: 95,
          errorCount: 5,
          groqRequestCount: 60,
          geminiRequestCount: 40,
          promptTokens: 5000,
          completionTokens: 3000,
          totalTokens: 8000,
          lastRequestAt: Date.now(),
        },
        recentEvents: [],
      };

      mockConvexQuery.mockResolvedValueOnce(mockDashboard);

      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByPlaceholderText("Usage dashboard password");
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      await user.type(passwordInput, "correctpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("100")).toBeInTheDocument(); // Request count
        expect(screen.getByText("95%")).toBeInTheDocument(); // Success rate
        expect(screen.getByText("8000")).toBeInTheDocument(); // Total tokens
      });
    });
  });

  describe("Dashboard Display", () => {
    it("should display usage metrics when dashboard is unlocked", async () => {
      const user = userEvent.setup();
      const mockDashboard = {
        totals: {
          requestCount: 150,
          successCount: 140,
          errorCount: 10,
          groqRequestCount: 90,
          geminiRequestCount: 60,
          promptTokens: 7500,
          completionTokens: 4500,
          totalTokens: 12000,
          lastRequestAt: Date.now() - 60000, // 1 minute ago
        },
        recentEvents: [],
      };

      mockConvexQuery.mockResolvedValueOnce(mockDashboard);

      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByPlaceholderText("Usage dashboard password");
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      await user.type(passwordInput, "correctpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("150")).toBeInTheDocument(); // Request count
        expect(screen.getByText("93%")).toBeInTheDocument(); // Success rate (140/150)
        expect(screen.getByText("12000")).toBeInTheDocument(); // Total tokens
        expect(screen.getByText("10")).toBeInTheDocument(); // Error count
      });
    });

    it("should display provider mix when dashboard is unlocked", async () => {
      const user = userEvent.setup();
      const mockDashboard = {
        totals: {
          requestCount: 100,
          successCount: 95,
          errorCount: 5,
          groqRequestCount: 60,
          geminiRequestCount: 40,
          promptTokens: 5000,
          completionTokens: 3000,
          totalTokens: 8000,
          lastRequestAt: Date.now(),
        },
        recentEvents: [],
      };

      mockConvexQuery.mockResolvedValueOnce(mockDashboard);

      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByPlaceholderText("Usage dashboard password");
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      await user.type(passwordInput, "correctpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Groq")).toBeInTheDocument();
        expect(screen.getByText("60")).toBeInTheDocument();
        expect(screen.getByText("Gemini")).toBeInTheDocument();
        expect(screen.getByText("40")).toBeInTheDocument();
      });
    });

    it("should display lock dashboard button when unlocked", async () => {
      const user = userEvent.setup();
      const mockDashboard = {
        totals: {
          requestCount: 100,
          successCount: 95,
          errorCount: 5,
          groqRequestCount: 60,
          geminiRequestCount: 40,
          promptTokens: 5000,
          completionTokens: 3000,
          totalTokens: 8000,
          lastRequestAt: Date.now(),
        },
        recentEvents: [],
      };

      mockConvexQuery.mockResolvedValueOnce(mockDashboard);

      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByPlaceholderText("Usage dashboard password");
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      await user.type(passwordInput, "correctpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Lock dashboard/i })).toBeInTheDocument();
      });
    });

    it("should lock dashboard when lock button is clicked", async () => {
      const user = userEvent.setup();
      const mockDashboard = {
        totals: {
          requestCount: 100,
          successCount: 95,
          errorCount: 5,
          groqRequestCount: 60,
          geminiRequestCount: 40,
          promptTokens: 5000,
          completionTokens: 3000,
          totalTokens: 8000,
          lastRequestAt: Date.now(),
        },
        recentEvents: [],
      };

      mockConvexQuery.mockResolvedValueOnce(mockDashboard);

      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByPlaceholderText("Usage dashboard password");
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      await user.type(passwordInput, "correctpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Lock dashboard/i })).toBeInTheDocument();
      });

      const lockButton = screen.getByRole("button", { name: /Lock dashboard/i });
      await user.click(lockButton);

      // Should show password form again
      expect(screen.getByPlaceholderText("Usage dashboard password")).toBeInTheDocument();
    });
  });

  describe("Recent Events Display", () => {
    it("should display recent events when available", async () => {
      const user = userEvent.setup();
      const mockDashboard = {
        totals: {
          requestCount: 100,
          successCount: 95,
          errorCount: 5,
          groqRequestCount: 60,
          geminiRequestCount: 40,
          promptTokens: 5000,
          completionTokens: 3000,
          totalTokens: 8000,
          lastRequestAt: Date.now(),
        },
        recentEvents: [
          {
            _id: "event1",
            provider: "groq" as const,
            model: "llama-3.2-90b-vision-preview",
            requestSource: "live_camera" as const,
            status: "success" as const,
            latencyMs: 1500,
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            timestamp: Date.now() - 30000, // 30 seconds ago
          },
        ],
      };

      mockConvexQuery.mockResolvedValueOnce(mockDashboard);

      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByPlaceholderText("Usage dashboard password");
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      await user.type(passwordInput, "correctpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("success")).toBeInTheDocument();
        expect(screen.getByText(/GROQ/)).toBeInTheDocument();
        expect(screen.getByText(/live camera/)).toBeInTheDocument();
        expect(screen.getByText(/Latency: 1500ms/)).toBeInTheDocument();
      });
    });

    it("should display message when no events are available", async () => {
      const user = userEvent.setup();
      const mockDashboard = {
        totals: {
          requestCount: 0,
          successCount: 0,
          errorCount: 0,
          groqRequestCount: 0,
          geminiRequestCount: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          lastRequestAt: null,
        },
        recentEvents: [],
      };

      mockConvexQuery.mockResolvedValueOnce(mockDashboard);

      render(
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByPlaceholderText("Usage dashboard password");
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      await user.type(passwordInput, "correctpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("No usage has been recorded yet for this account.")
        ).toBeInTheDocument();
      });
    });
  });
});
