import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useRouteError, useNavigate } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import RouteErrorBoundary from "./RouteErrorBoundary";

// Mock React Router hooks
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useRouteError: vi.fn(),
    useNavigate: vi.fn(),
  };
});

describe("RouteErrorBoundary", () => {
  const mockNavigate = vi.fn();
  const mockError = new Error("Test route error");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useRouteError).mockReturnValue(mockError);
    
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders error message", () => {
    render(<RouteErrorBoundary />);
    
    expect(screen.getByText("Failed to load page")).toBeInTheDocument();
    expect(
      screen.getByText(/Something went wrong while loading this page/)
    ).toBeInTheDocument();
  });

  it("displays retry button", () => {
    render(<RouteErrorBoundary />);
    
    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it("displays go to home button", () => {
    render(<RouteErrorBoundary />);
    
    const homeButton = screen.getByRole("button", { name: /go to home/i });
    expect(homeButton).toBeInTheDocument();
  });

  it("reloads page when retry button is clicked", async () => {
    const user = userEvent.setup();
    const mockReload = vi.fn();
    
    // Mock window.location.reload
    Object.defineProperty(window, "location", {
      value: { reload: mockReload },
      writable: true,
    });

    render(<RouteErrorBoundary />);
    
    const retryButton = screen.getByRole("button", { name: /retry/i });
    await user.click(retryButton);
    
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it("navigates to home when go to home button is clicked", async () => {
    const user = userEvent.setup();
    
    render(<RouteErrorBoundary />);
    
    const homeButton = screen.getByRole("button", { name: /go to home/i });
    await user.click(homeButton);
    
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("logs error to console", () => {
    render(<RouteErrorBoundary />);
    
    expect(console.error).toHaveBeenCalledWith("Route error:", mockError);
  });

  it("displays error icon", () => {
    const { container } = render(<RouteErrorBoundary />);
    
    // Check for SVG icon presence
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});
