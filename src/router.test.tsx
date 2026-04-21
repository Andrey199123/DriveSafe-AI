import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import type { ReactElement } from "react";

// Component that throws an error
function ErrorComponent(): ReactElement {
  throw new Error("Test error");
}

describe("Router Error Handling", () => {
  it("displays error boundary when route component throws error", () => {
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, "error").mockImplementation(() => {});

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <div>Home</div>,
          errorElement: <RouteErrorBoundary />,
        },
        {
          path: "/error",
          element: <ErrorComponent />,
          errorElement: <RouteErrorBoundary />,
        },
      ],
      {
        initialEntries: ["/error"],
      }
    );

    render(<RouterProvider router={router} />);

    // Verify error boundary is displayed
    expect(screen.getByText("Failed to load page")).toBeInTheDocument();
    expect(
      screen.getByText(/Something went wrong while loading this page/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /go to home/i })
    ).toBeInTheDocument();
  });

  it("redirects to landing page for invalid routes", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <div>Landing Page</div>,
        },
        {
          path: "*",
          element: <div>Redirecting...</div>,
        },
      ],
      {
        initialEntries: ["/invalid-route"],
      }
    );

    render(<RouterProvider router={router} />);

    // The catch-all route should handle this
    expect(screen.getByText("Redirecting...")).toBeInTheDocument();
  });
});
