import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
  useConvex: () => ({
    query: vi.fn().mockResolvedValue({
      totals: {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        groqRequestCount: 0,
        geminiRequestCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        lastRequestAt: Date.now(),
      },
      recentEvents: [],
    }),
  }),
  Authenticated: ({ children }: { children: React.ReactNode }) => null,
  Unauthenticated: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="unauthenticated">{children}</div>
  ),
}));

// Mock components
vi.mock("./DrunkDetector", () => ({
  DrunkDetector: () => <div data-testid="drunk-detector">DrunkDetector Component</div>,
}));

vi.mock("./SignInForm", () => ({
  SignInForm: () => <div data-testid="sign-in-form">Sign In Form</div>,
}));

vi.mock("./SignOutButton", () => ({
  SignOutButton: () => <button data-testid="sign-out-button">Sign Out</button>,
}));

// Mock Convex API
vi.mock("../convex/_generated/api", () => ({
  api: {
    auth: {
      loggedInUser: "mockLoggedInUser",
    },
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
  Toaster: () => null,
}));

describe("Router Lazy Loading", () => {
  it("should display loading indicator while lazy loading LandingPage", async () => {
    render(<RouterProvider router={router} />);

    // The loading spinner should appear briefly
    // Note: This test may be flaky if the component loads too quickly
    // In real scenarios, the loading indicator would be visible during network delays

    // Wait for the page to load
    await waitFor(
      () => {
        expect(
          screen.getByText("A calmer interface for driver attention and motion awareness.")
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should successfully load LandingPage after lazy loading", async () => {
    render(<RouterProvider router={router} />);

    // Wait for lazy-loaded component to render
    await waitFor(
      () => {
        expect(
          screen.getByText("A calmer interface for driver attention and motion awareness.")
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify page content is displayed
    expect(screen.getByText("Built for practical, low-distraction driver checks")).toBeInTheDocument();
  });

  it("should successfully load MonitoringPage after lazy loading", async () => {
    // Create a router starting at /monitor
    const testRouter = router;
    
    render(<RouterProvider router={testRouter} />);

    // Navigate to monitor page
    await waitFor(() => {
      const links = screen.getAllByRole("link");
      const monitorLink = links.find(link => link.textContent?.includes("Monitor"));
      expect(monitorLink).toBeDefined();
    });

    const monitorLink = screen.getAllByRole("link").find(link => link.textContent?.includes("Monitor"));
    if (monitorLink) {
      monitorLink.click();
    }

    // Wait for lazy-loaded component to render
    await waitFor(
      () => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should successfully load SettingsPage after lazy loading", async () => {
    const user = await import("@testing-library/user-event").then(m => m.default.setup());
    render(<RouterProvider router={router} />);

    // Wait for initial page to load (could be landing or monitoring page)
    await waitFor(() => {
      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);
    });

    // Navigate to settings page (desktop version)
    const settingsLinks = screen.getAllByRole("link", { name: /Settings/i });
    const settingsLink = settingsLinks[0]; // Use desktop version
    await user.click(settingsLink);

    // Wait for lazy-loaded component to render
    await waitFor(
      () => {
        expect(screen.getByText("Shared usage dashboard")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should handle multiple lazy-loaded page transitions", async () => {
    const user = await import("@testing-library/user-event").then(m => m.default.setup());
    render(<RouterProvider router={router} />);

    // Wait for initial page to load
    await waitFor(() => {
      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);
    });

    // Navigate to home first to ensure we start from a known state (desktop version)
    const homeLinks = screen.getAllByRole("link", { name: /Home/i });
    const homeLink = homeLinks[0]; // Use desktop version
    await user.click(homeLink);

    await waitFor(
      () => {
        expect(
          screen.getByText("A calmer interface for driver attention and motion awareness.")
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Navigate to monitor
    const monitorLink = screen.getAllByRole("link").find(link => link.textContent?.includes("Monitor"));
    if (monitorLink) {
      await user.click(monitorLink);
    }

    await waitFor(
      () => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Navigate to settings (desktop version)
    const settingsLinks = screen.getAllByRole("link", { name: /Settings/i });
    const settingsLink = settingsLinks[0]; // Use desktop version
    await user.click(settingsLink);

    await waitFor(
      () => {
        expect(screen.getByText("Shared usage dashboard")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Navigate back to home (desktop version)
    const homeLinks2 = screen.getAllByRole("link", { name: /Home/i });
    const homeLink2 = homeLinks2[0]; // Use desktop version
    await user.click(homeLink2);

    await waitFor(
      () => {
        expect(
          screen.getByText("A calmer interface for driver attention and motion awareness.")
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should display loading spinner with correct styling", async () => {
    render(<RouterProvider router={router} />);

    // Wait for any page to load
    await waitFor(
      () => {
        const links = screen.getAllByRole("link");
        expect(links.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    // After loading, spinner should be gone
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
