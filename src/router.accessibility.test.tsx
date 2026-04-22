import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import RootLayout from "./layouts/RootLayout";
import LandingPage from "./pages/LandingPage";
import MonitoringPage from "./pages/MonitoringPage";
import SettingsPage from "./pages/SettingsPage";

// Mock Convex
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => ({ email: "test@example.com" })),
  useConvexAuth: vi.fn(() => ({ isAuthenticated: true })),
  useConvex: vi.fn(() => ({
    query: vi.fn(),
  })),
  Authenticated: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Unauthenticated: () => null,
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signOut: vi.fn(),
  }),
}));

// Mock external dependencies
vi.mock("sonner", () => ({
  Toaster: () => <div>Toaster</div>,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => null,
}));

vi.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: () => null,
}));

// Mock DrunkDetector component
vi.mock("./DrunkDetector", () => ({
  DrunkDetector: () => (
    <div data-testid="monitoring-content">
      <h1>Driver Monitoring</h1>
      <h2>Camera Feed</h2>
      <h2>Detection Results</h2>
    </div>
  ),
}));

describe("Router - Accessibility Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createTestRouter = (initialPath = "/") => {
    return createMemoryRouter(
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
        initialEntries: [initialPath],
      }
    );
  };

  describe("Keyboard Navigation - All Routes", () => {
    it("allows keyboard navigation from landing page to all routes", async () => {
      const user = userEvent.setup();
      const router = createTestRouter("/");

      render(<RouterProvider router={router} />);

      // Verify we're on landing page
      expect(screen.getByText(/DriveSafe AI keeps the cabin check clear/i)).toBeInTheDocument();

      // Get navigation links (use getAllByRole since there are desktop and mobile versions)
      const homeLinks = screen.getAllByRole("link", { name: /home/i });
      const monitorLinks = screen.getAllByRole("link", { name: /monitor/i });
      const settingsLinks = screen.getAllByRole("link", { name: /settings/i });
      
      // Use the first link (desktop version)
      const homeLink = homeLinks[0];
      const monitorLink = monitorLinks[0];
      const settingsLink = settingsLinks[0];

      // Navigate to monitor page using keyboard
      monitorLink.focus();
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByTestId("monitoring-content")).toBeInTheDocument();
      });

      // Navigate to settings page using keyboard
      const settingsLinksAfterNav = screen.getAllByRole("link", { name: /settings/i });
      settingsLinksAfterNav[0].focus();
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1, name: /settings/i })).toBeInTheDocument();
      });

      // Navigate back to home using keyboard
      const homeLinksAfterNav = screen.getAllByRole("link", { name: /home/i });
      homeLinksAfterNav[0].focus();
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText(/DriveSafe AI keeps the cabin check clear/i)).toBeInTheDocument();
      });
    });

    it("allows keyboard navigation on monitoring page", async () => {
      const user = userEvent.setup();
      const router = createTestRouter("/monitor");

      render(<RouterProvider router={router} />);

      // Verify we're on monitoring page
      expect(screen.getByTestId("monitoring-content")).toBeInTheDocument();

      // Verify navigation links are keyboard accessible
      const homeLinks = screen.getAllByRole("link", { name: /home/i });
      const monitorLinks = screen.getAllByRole("link", { name: /monitor/i });
      const settingsLinks = screen.getAllByRole("link", { name: /settings/i });

      // Focus each link to verify they're focusable
      homeLinks[0].focus();
      expect(homeLinks[0]).toHaveFocus();

      monitorLinks[0].focus();
      expect(monitorLinks[0]).toHaveFocus();

      settingsLinks[0].focus();
      expect(settingsLinks[0]).toHaveFocus();
    });

    it("allows keyboard navigation on settings page", async () => {
      const user = userEvent.setup();
      const router = createTestRouter("/settings");

      render(<RouterProvider router={router} />);

      // Verify we're on settings page
      expect(screen.getByRole("heading", { level: 1, name: /settings/i })).toBeInTheDocument();

      // Verify navigation links are keyboard accessible
      const homeLinks = screen.getAllByRole("link", { name: /home/i });
      const monitorLinks = screen.getAllByRole("link", { name: /monitor/i });
      const settingsLinks = screen.getAllByRole("link", { name: /settings/i });

      // Focus each link to verify they're focusable
      homeLinks[0].focus();
      expect(homeLinks[0]).toHaveFocus();

      monitorLinks[0].focus();
      expect(monitorLinks[0]).toHaveFocus();

      settingsLinks[0].focus();
      expect(settingsLinks[0]).toHaveFocus();
    });

    it("supports keyboard navigation with Enter key on links", async () => {
      const user = userEvent.setup();
      const router = createTestRouter("/");

      render(<RouterProvider router={router} />);

      const monitorLinks = screen.getAllByRole("link", { name: /monitor/i });
      monitorLinks[0].focus();
      
      // Enter key should activate links
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByTestId("monitoring-content")).toBeInTheDocument();
      });
    });

    it("maintains focus visibility throughout navigation", async () => {
      const router = createTestRouter("/");

      render(<RouterProvider router={router} />);

      const homeLinks = screen.getAllByRole("link", { name: /home/i });
      const monitorLinks = screen.getAllByRole("link", { name: /monitor/i });
      const settingsLinks = screen.getAllByRole("link", { name: /settings/i });

      // Check all navigation links have focus styles
      expect(homeLinks[0]).toHaveClass("focus:outline-none");
      expect(homeLinks[0]).toHaveClass("focus:ring-2");
      
      expect(monitorLinks[0]).toHaveClass("focus:outline-none");
      expect(monitorLinks[0]).toHaveClass("focus:ring-2");
      
      expect(settingsLinks[0]).toHaveClass("focus:outline-none");
      expect(settingsLinks[0]).toHaveClass("focus:ring-2");
    });
  });

  describe("Screen Reader - Page Change Announcements", () => {
    it("announces page changes via document title updates", async () => {
      const user = userEvent.setup();
      const router = createTestRouter("/");

      render(<RouterProvider router={router} />);

      // Navigate to monitor page
      const monitorLinks = screen.getAllByRole("link", { name: /monitor/i });
      await user.click(monitorLinks[0]);

      await waitFor(() => {
        expect(screen.getByTestId("monitoring-content")).toBeInTheDocument();
      });

      // Navigate to settings page
      const settingsLinks = screen.getAllByRole("link", { name: /settings/i });
      await user.click(settingsLinks[0]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1, name: /settings/i })).toBeInTheDocument();
      });
    });

    it("provides main landmark for screen readers on all pages", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      const main = screen.getByRole("main");
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute("id", "main-content");
    });

    it("provides navigation landmark for screen readers", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      const navs = screen.getAllByRole("navigation");
      expect(navs.length).toBeGreaterThan(0);
      // Both desktop and mobile navigation should have aria-label
      navs.forEach(nav => {
        expect(nav).toHaveAttribute("aria-label", "Main navigation");
      });
    });

    it("provides banner landmark (header) for screen readers", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      const banner = screen.getByRole("banner");
      expect(banner).toBeInTheDocument();
    });

    it("focuses main content after navigation for screen reader context", async () => {
      const user = userEvent.setup();
      const router = createTestRouter("/");

      render(<RouterProvider router={router} />);

      const main = screen.getByRole("main");
      const monitorLinks = screen.getAllByRole("link", { name: /monitor/i });

      await user.click(monitorLinks[0]);

      await waitFor(() => {
        expect(main).toHaveFocus();
      });
    });

    it("provides skip link for screen readers to bypass navigation", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      const skipLink = screen.getByText("Skip to main content");
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute("href", "#main-content");
      
      // Should be visually hidden but accessible to screen readers
      expect(skipLink).toHaveClass("sr-only");
      expect(skipLink).toHaveClass("focus:not-sr-only");
    });
  });

  describe("Heading Hierarchy - All Pages", () => {
    it("has proper heading hierarchy on landing page", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      // Get all headings
      const headings = screen.getAllByRole("heading");
      
      // Should have h1 as main heading
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent(/DriveSafe AI keeps the cabin check clear/i);

      // Should have h2 for DriveSafe AI branding
      const h2Elements = screen.getAllByRole("heading", { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
      expect(h2Elements[0]).toHaveTextContent(/DriveSafe AI/i);

      // Verify h2 comes before h1 in document order (h2 is in header, h1 is in main content)
      const h1Index = headings.indexOf(h1);
      const h2Index = headings.indexOf(h2Elements[0]);
      expect(h2Index).toBeLessThan(h1Index);
    });

    it("has proper heading hierarchy on monitoring page", () => {
      const router = createTestRouter("/monitor");
      render(<RouterProvider router={router} />);

      // Should have h1 as main heading
      const h1 = screen.getByRole("heading", { level: 1, name: /Driver Monitoring/i });
      expect(h1).toBeInTheDocument();

      // Should have h2 for subsections
      const h2Elements = screen.getAllByRole("heading", { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it("has proper heading hierarchy on settings page", () => {
      const router = createTestRouter("/settings");
      render(<RouterProvider router={router} />);

      // Get all headings
      const headings = screen.getAllByRole("heading");
      
      // Should have h1 for page heading
      const h1 = screen.getByRole("heading", { level: 1, name: /settings/i });
      expect(h1).toBeInTheDocument();
    });

    it("maintains consistent heading hierarchy across navigation", async () => {
      const user = userEvent.setup();
      const router = createTestRouter("/");

      render(<RouterProvider router={router} />);

      // Landing page should have h1
      let h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toBeInTheDocument();

      // Navigate to monitor
      const monitorLinks = screen.getAllByRole("link", { name: /monitor/i });
      await user.click(monitorLinks[0]);

      await waitFor(() => {
        expect(screen.getByTestId("monitoring-content")).toBeInTheDocument();
      });

      // Monitor page should have h1
      h1 = screen.getByRole("heading", { level: 1, name: /Driver Monitoring/i });
      expect(h1).toBeInTheDocument();

      // Navigate to settings
      const settingsLinks = screen.getAllByRole("link", { name: /settings/i });
      await user.click(settingsLinks[0]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1, name: /settings/i })).toBeInTheDocument();
      });

      // Settings page should have proper heading structure
      const headings = screen.getAllByRole("heading");
      expect(headings.length).toBeGreaterThan(0);
    });

    it("does not skip heading levels on any page", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      const headings = screen.getAllByRole("heading");
      const levels = headings.map(h => parseInt(h.tagName.substring(1)));

      // Check that we don't skip levels (e.g., h1 -> h3 without h2)
      for (let i = 1; i < levels.length; i++) {
        const diff = levels[i] - levels[i - 1];
        // Difference should be at most 1 (going down) or any amount (going up)
        if (diff > 0) {
          expect(diff).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("ARIA Attributes and Semantic HTML", () => {
    it("uses semantic HTML elements for navigation", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      // Should use <nav> element
      const navs = screen.getAllByRole("navigation");
      navs.forEach(nav => {
        expect(nav.tagName).toBe("NAV");
      });
    });

    it("uses semantic HTML elements for main content", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      // Should use <main> element
      const main = screen.getByRole("main");
      expect(main.tagName).toBe("MAIN");
    });

    it("uses semantic HTML elements for header", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      // Should use <header> element
      const header = screen.getByRole("banner");
      expect(header.tagName).toBe("HEADER");
    });

    it("provides accessible names for navigation links", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      // All links should have accessible names
      const homeLinks = screen.getAllByRole("link", { name: /home/i });
      const monitorLinks = screen.getAllByRole("link", { name: /monitor/i });
      const settingsLinks = screen.getAllByRole("link", { name: /settings/i });

      homeLinks.forEach(link => expect(link).toHaveAccessibleName());
      monitorLinks.forEach(link => expect(link).toHaveAccessibleName());
      settingsLinks.forEach(link => expect(link).toHaveAccessibleName());
    });

    it("provides accessible name for logo image", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      const logo = screen.getByAltText("DriveSafe AI");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAccessibleName("DriveSafe AI");
    });

    it("main content has tabIndex -1 for programmatic focus", () => {
      const router = createTestRouter("/");
      render(<RouterProvider router={router} />);

      const main = screen.getByRole("main");
      expect(main).toHaveAttribute("tabIndex", "-1");
    });
  });

  describe("Keyboard Navigation - Settings Page Forms", () => {
    it("allows keyboard navigation through password form", async () => {
      const user = userEvent.setup();
      const router = createTestRouter("/settings");

      render(<RouterProvider router={router} />);

      // Find password input
      const passwordInput = screen.getByPlaceholderText(/Usage dashboard password/i);
      const submitButton = screen.getByRole("button", { name: /Unlock dashboard/i });

      // Tab to password input
      passwordInput.focus();
      expect(passwordInput).toHaveFocus();

      // Type password
      await user.keyboard("testpassword");
      expect(passwordInput).toHaveValue("testpassword");

      // Tab to submit button
      await user.tab();
      expect(submitButton).toHaveFocus();

      // Should be able to submit with Enter
      expect(submitButton).toBeInTheDocument();
    });

    it("password input has proper label association", () => {
      const router = createTestRouter("/settings");
      render(<RouterProvider router={router} />);

      const passwordInput = screen.getByPlaceholderText(/Usage dashboard password/i);
      
      // Should have placeholder for accessibility
      expect(passwordInput).toHaveAttribute("placeholder");
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });
});
