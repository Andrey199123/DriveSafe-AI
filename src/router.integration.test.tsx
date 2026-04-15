import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import LandingPage from "./pages/LandingPage";
import MonitoringPage from "./pages/MonitoringPage";
import SettingsPage from "./pages/SettingsPage";

// Mock Convex hooks for authentication testing
let mockUserData: any = null;

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => mockUserData),
  useConvex: () => ({
    query: vi.fn().mockResolvedValue({
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
    }),
  }),
  Authenticated: ({ children }: { children: React.ReactNode }) => {
    return mockUserData !== null && mockUserData !== undefined ? (
      <div data-testid="authenticated">{children}</div>
    ) : null;
  },
  Unauthenticated: ({ children }: { children: React.ReactNode }) => {
    return mockUserData === null ? <div data-testid="unauthenticated">{children}</div> : null;
  },
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

describe("Navigation Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserData = null; // Reset to unauthenticated state
  });

  describe("Navigation from Landing to Monitoring Page", () => {
    it("should navigate from landing page to monitoring page when authenticated", async () => {
      const user = userEvent.setup();
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/"],
        }
      );

      render(<RouterProvider router={router} />);

      // Verify we're on the landing page
      expect(
        screen.getByText("A calmer interface for driver attention and motion awareness.")
      ).toBeInTheDocument();

      // Click the monitoring link
      const monitoringLink = screen.getByRole("link", { name: /Go to Monitoring/i });
      await user.click(monitoringLink);

      // Verify we're now on the monitoring page
      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });

      // Verify landing page content is not displayed
      expect(
        screen.queryByText("Sign in with email or continue anonymously to test the monitor")
      ).not.toBeInTheDocument();
    });

    it("should navigate to monitoring page via header navigation link", async () => {
      const user = userEvent.setup();
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/"],
        }
      );

      render(<RouterProvider router={router} />);

      // Find and click the Monitor link in the header navigation (desktop version)
      const headerMonitorLinks = screen.getAllByRole("link", { name: /Monitor/i });
      const headerMonitorLink = headerMonitorLinks[0]; // Use desktop version
      await user.click(headerMonitorLink);

      // Verify we're now on the monitoring page
      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation from Monitoring to Settings Page", () => {
    it("should navigate from monitoring page to settings page", async () => {
      const user = userEvent.setup();
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/monitor"],
        }
      );

      render(<RouterProvider router={router} />);

      // Verify we're on the monitoring page
      expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();

      // Click the settings link in the header (desktop version)
      const settingsLinks = screen.getAllByRole("link", { name: /Settings/i });
      const settingsLink = settingsLinks[0]; // Use desktop version
      await user.click(settingsLink);

      // Verify we're now on the settings page
      await waitFor(() => {
        expect(screen.getByText("Shared usage dashboard")).toBeInTheDocument();
      });

      // Verify monitoring page content is not displayed
      expect(screen.queryByTestId("drunk-detector")).not.toBeInTheDocument();
    });
  });

  describe("Browser Back/Forward Button Navigation", () => {
    it("should navigate back to landing page when browser back button is used", async () => {
      const user = userEvent.setup();
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/"],
        }
      );

      render(<RouterProvider router={router} />);

      // Navigate to monitoring page
      const monitoringLink = screen.getByRole("link", { name: /Go to Monitoring/i });
      await user.click(monitoringLink);

      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });

      // Simulate browser back button
      router.navigate(-1);

      // Verify we're back on the landing page
      await waitFor(() => {
        expect(
          screen.getByText("A calmer interface for driver attention and motion awareness.")
        ).toBeInTheDocument();
      });
    });

    it("should navigate forward to monitoring page when browser forward button is used", async () => {
      const user = userEvent.setup();
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/"],
        }
      );

      render(<RouterProvider router={router} />);

      // Navigate to monitoring page
      const monitoringLink = screen.getByRole("link", { name: /Go to Monitoring/i });
      await user.click(monitoringLink);

      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });

      // Go back
      router.navigate(-1);

      await waitFor(() => {
        expect(
          screen.getByText("A calmer interface for driver attention and motion awareness.")
        ).toBeInTheDocument();
      });

      // Simulate browser forward button
      router.navigate(1);

      // Verify we're back on the monitoring page
      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });
    });

    it("should maintain navigation history through multiple page transitions", async () => {
      const user = userEvent.setup();
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/"],
        }
      );

      render(<RouterProvider router={router} />);

      // Navigate: Landing -> Monitor -> Settings
      const monitoringLink = screen.getByRole("link", { name: /Go to Monitoring/i });
      await user.click(monitoringLink);

      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });

      const settingsLinks = screen.getAllByRole("link", { name: /Settings/i });
      const settingsLink = settingsLinks[0]; // Use desktop version
      await user.click(settingsLink);

      await waitFor(() => {
        expect(screen.getByText("Shared usage dashboard")).toBeInTheDocument();
      });

      // Go back twice: Settings -> Monitor -> Landing
      router.navigate(-1);

      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });

      router.navigate(-1);

      await waitFor(() => {
        expect(
          screen.getByText("A calmer interface for driver attention and motion awareness.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Direct URL Entry for Each Route", () => {
    it("should render landing page when navigating directly to root URL", () => {
      mockUserData = null;

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/"],
        }
      );

      render(<RouterProvider router={router} />);

      expect(
        screen.getByText("A calmer interface for driver attention and motion awareness.")
      ).toBeInTheDocument();
      expect(screen.getByTestId("sign-in-form")).toBeInTheDocument();
    });

    it("should render monitoring page when navigating directly to /monitor URL", () => {
      mockUserData = null;

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/monitor"],
        }
      );

      render(<RouterProvider router={router} />);

      expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
    });

    it("should render settings page when navigating directly to /settings URL", () => {
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                path: "settings",
                element: <SettingsPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/settings"],
        }
      );

      render(<RouterProvider router={router} />);

      expect(screen.getByText("Shared usage dashboard")).toBeInTheDocument();
    });

    it("should redirect to landing page when navigating to invalid URL", () => {
      mockUserData = null;

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
              {
                path: "*",
                element: <LandingPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/invalid-route"],
        }
      );

      render(<RouterProvider router={router} />);

      // Should display landing page content
      expect(
        screen.getByText("A calmer interface for driver attention and motion awareness.")
      ).toBeInTheDocument();
    });
  });

  describe("Authentication State Preservation During Navigation", () => {
    it("should preserve authenticated state when navigating from landing to monitoring", async () => {
      const user = userEvent.setup();
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/"],
        }
      );

      render(<RouterProvider router={router} />);

      // Verify authenticated state on landing page
      expect(screen.getByText(/Welcome back, test@example.com/i)).toBeInTheDocument();

      // Navigate to monitoring page
      const monitoringLink = screen.getByRole("link", { name: /Go to Monitoring/i });
      await user.click(monitoringLink);

      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });

      // Verify sign-out button is still present (auth state preserved)
      expect(screen.getByTestId("sign-out-button")).toBeInTheDocument();
    });

    it("should preserve authenticated state when navigating from monitoring to settings", async () => {
      const user = userEvent.setup();
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/monitor"],
        }
      );

      render(<RouterProvider router={router} />);

      // Verify we're on monitoring page
      expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      expect(screen.getByTestId("sign-out-button")).toBeInTheDocument();

      // Navigate to settings page (desktop version)
      const settingsLinks = screen.getAllByRole("link", { name: /Settings/i });
      const settingsLink = settingsLinks[0]; // Use desktop version
      await user.click(settingsLink);

      await waitFor(() => {
        expect(screen.getByText("Shared usage dashboard")).toBeInTheDocument();
      });

      // Verify sign-out button is still present (auth state preserved)
      expect(screen.getByTestId("sign-out-button")).toBeInTheDocument();
    });

    it("should preserve unauthenticated state when navigating between pages", async () => {
      const user = userEvent.setup();
      mockUserData = null;

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/"],
        }
      );

      render(<RouterProvider router={router} />);

      // Verify unauthenticated state on landing page
      expect(screen.getAllByTestId("unauthenticated").length).toBeGreaterThan(0);

      // Navigate to monitoring page via header link (desktop version)
      const headerMonitorLinks = screen.getAllByRole("link", { name: /Monitor/i });
      const headerMonitorLink = headerMonitorLinks[0]; // Use desktop version
      await user.click(headerMonitorLink);

      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });

      // Verify unauthenticated state is preserved (no authenticated content)
      expect(screen.queryByTestId("authenticated")).not.toBeInTheDocument();
    });

    it("should maintain authentication state across multiple page transitions", async () => {
      const user = userEvent.setup();
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/"],
        }
      );

      render(<RouterProvider router={router} />);

      // Start on landing page - verify authenticated
      expect(screen.getByText(/Welcome back, test@example.com/i)).toBeInTheDocument();

      // Navigate to monitoring
      const monitoringLink = screen.getByRole("link", { name: /Go to Monitoring/i });
      await user.click(monitoringLink);

      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });
      expect(screen.getByTestId("sign-out-button")).toBeInTheDocument();

      // Navigate to settings (desktop version)
      const settingsLinks = screen.getAllByRole("link", { name: /Settings/i });
      const settingsLink = settingsLinks[0]; // Use desktop version
      await user.click(settingsLink);

      await waitFor(() => {
        expect(screen.getByText("Shared usage dashboard")).toBeInTheDocument();
      });
      expect(screen.getByTestId("sign-out-button")).toBeInTheDocument();

      // Navigate back to landing (desktop version)
      const homeLinks = screen.getAllByRole("link", { name: /Home/i });
      const homeLink = homeLinks[0]; // Use desktop version
      await user.click(homeLink);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, test@example.com/i)).toBeInTheDocument();
      });
      expect(screen.getByTestId("sign-out-button")).toBeInTheDocument();
    });

    it("should not require re-authentication when using browser back button", async () => {
      const user = userEvent.setup();
      mockUserData = { email: "test@example.com" };

      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: <RootLayout />,
            children: [
              {
                index: true,
                element: <LandingPage />,
              },
              {
                path: "monitor",
                element: <MonitoringPage />,
              },
            ],
          },
        ],
        {
          initialEntries: ["/"],
        }
      );

      render(<RouterProvider router={router} />);

      // Navigate to monitoring
      const monitoringLink = screen.getByRole("link", { name: /Go to Monitoring/i });
      await user.click(monitoringLink);

      await waitFor(() => {
        expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      });

      // Go back
      router.navigate(-1);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, test@example.com/i)).toBeInTheDocument();
      });

      // Verify still authenticated (no sign-in form)
      expect(screen.queryByTestId("sign-in-form")).not.toBeInTheDocument();
      expect(screen.getByTestId("sign-out-button")).toBeInTheDocument();
    });
  });
});
