import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import RootLayout from "./layouts/RootLayout";

// Mock child components
vi.mock("./SignOutButton", () => ({
  SignOutButton: () => <button>Sign Out</button>,
}));

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

describe("Router - Focus Management", () => {
  it("moves focus to main content when navigating between pages", async () => {
    const user = userEvent.setup();

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <RootLayout />,
          children: [
            {
              index: true,
              element: <div data-testid="home-page">Home Page Content</div>,
            },
            {
              path: "monitor",
              element: <div data-testid="monitor-page">Monitor Page Content</div>,
            },
            {
              path: "settings",
              element: <div data-testid="settings-page">Settings Page Content</div>,
            },
          ],
        },
      ],
      {
        initialEntries: ["/"],
      }
    );

    render(<RouterProvider router={router} />);

    // Verify we're on home page
    expect(screen.getByTestId("home-page")).toBeInTheDocument();

    // Get the main element
    const main = screen.getByRole("main");

    // Navigate to monitor page using the router (desktop version)
    const monitorLinks = screen.getAllByRole("link", { name: /monitor/i });
    const monitorLink = monitorLinks[0]; // Use desktop version
    await user.click(monitorLink);

    // Wait for navigation
    await waitFor(() => {
      expect(screen.getByTestId("monitor-page")).toBeInTheDocument();
    });

    // Verify main content has focus after navigation
    await waitFor(() => {
      expect(main).toHaveFocus();
    });

    // Navigate to settings page (desktop version)
    const settingsLinks = screen.getAllByRole("link", { name: /settings/i });
    const settingsLink = settingsLinks[0]; // Use desktop version
    await user.click(settingsLink);

    await waitFor(() => {
      expect(screen.getByTestId("settings-page")).toBeInTheDocument();
    });

    // Verify main content has focus again
    await waitFor(() => {
      expect(main).toHaveFocus();
    });
  });

  it("skip link is accessible and functional", async () => {
    const user = userEvent.setup();

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <RootLayout />,
          children: [
            {
              index: true,
              element: <div data-testid="home-page">Home Page Content</div>,
            },
          ],
        },
      ],
      {
        initialEntries: ["/"],
      }
    );

    render(<RouterProvider router={router} />);

    const skipLink = screen.getByText("Skip to main content");
    
    // Focus the skip link
    skipLink.focus();
    expect(skipLink).toHaveFocus();

    // Verify it links to main content
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("main content is keyboard accessible with tabIndex -1", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <RootLayout />,
          children: [
            {
              index: true,
              element: <div>Home Page Content</div>,
            },
          ],
        },
      ],
      {
        initialEntries: ["/"],
      }
    );

    render(<RouterProvider router={router} />);

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("tabIndex", "-1");
    expect(main).toHaveAttribute("id", "main-content");
  });

  it("skip link is visually hidden until focused", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <RootLayout />,
          children: [
            {
              index: true,
              element: <div>Home Page Content</div>,
            },
          ],
        },
      ],
      {
        initialEntries: ["/"],
      }
    );

    render(<RouterProvider router={router} />);

    const skipLink = screen.getByText("Skip to main content");
    
    // Should have sr-only class (screen reader only)
    expect(skipLink).toHaveClass("sr-only");
    
    // Should become visible when focused
    expect(skipLink).toHaveClass("focus:not-sr-only");
    expect(skipLink).toHaveClass("focus:absolute");
  });
});
