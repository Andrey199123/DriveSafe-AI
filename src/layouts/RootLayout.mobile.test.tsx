import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RootLayout from "./RootLayout";

// Mock the child components
vi.mock("../SignOutButton", () => ({
  SignOutButton: () => <button>Sign Out</button>,
}));

vi.mock("../components/Navigation", () => ({
  default: ({ className }: { className?: string }) => (
    <nav className={className} aria-label="Main navigation">
      <a href="/">Home</a>
      <a href="/monitor">Monitor</a>
      <a href="/settings">Settings</a>
    </nav>
  ),
}));

// Mock external dependencies
vi.mock("sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => null,
}));

vi.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: () => null,
}));

describe("RootLayout Mobile Navigation", () => {
  it("renders mobile navigation with proper visibility classes", () => {
    render(
      <MemoryRouter>
        <RootLayout />
      </MemoryRouter>
    );

    const navElements = screen.getAllByRole("navigation", { name: /main navigation/i });
    
    // Should have two navigation instances: one for desktop (hidden on mobile), one for mobile (hidden on desktop)
    expect(navElements).toHaveLength(2);
    
    // Desktop navigation should be hidden on mobile
    expect(navElements[0]).toHaveClass("hidden");
    expect(navElements[0]).toHaveClass("md:flex");
    
    // Mobile navigation should be visible on mobile, hidden on desktop
    expect(navElements[1]).toHaveClass("flex");
    expect(navElements[1]).toHaveClass("justify-center");
  });

  it("mobile navigation is in a separate container below header", () => {
    const { container } = render(
      <MemoryRouter>
        <RootLayout />
      </MemoryRouter>
    );

    // Find the mobile navigation container
    const mobileNavContainer = container.querySelector(".md\\:hidden");
    expect(mobileNavContainer).toBeInTheDocument();
    expect(mobileNavContainer).toHaveClass("border-t");
    expect(mobileNavContainer).toHaveClass("border-[#e2e8f0]");
    expect(mobileNavContainer).toHaveClass("bg-white");
    expect(mobileNavContainer).toHaveClass("px-4");
    expect(mobileNavContainer).toHaveClass("py-3");
  });

  it("header has sticky positioning for mobile", () => {
    const { container } = render(
      <MemoryRouter>
        <RootLayout />
      </MemoryRouter>
    );

    const header = container.querySelector("header");
    expect(header).toHaveClass("sticky");
    expect(header).toHaveClass("top-0");
    expect(header).toHaveClass("z-20");
  });

  it("main content has proper mobile padding", () => {
    render(
      <MemoryRouter>
        <RootLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole("main");
    expect(main).toHaveClass("px-4");
    expect(main).toHaveClass("py-10");
    expect(main).toHaveClass("sm:px-6");
    expect(main).toHaveClass("sm:py-14");
  });
});
