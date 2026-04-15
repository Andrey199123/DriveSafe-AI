import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RootLayout from "./RootLayout";

// Mock child components
vi.mock("../SignOutButton", () => ({
  SignOutButton: () => <button>Sign Out</button>,
}));

vi.mock("../components/Navigation", () => ({
  default: () => <nav>Navigation</nav>,
}));

vi.mock("sonner", () => ({
  Toaster: () => <div>Toaster</div>,
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => null,
}));

vi.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: () => null,
}));

describe("RootLayout - Focus Management and Accessibility", () => {
  it("renders skip link for screen readers", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const skipLink = screen.getByText("Skip to main content");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("main content has proper accessibility attributes", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabIndex", "-1");
  });

  it("skip link is visually hidden but focusable", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const skipLink = screen.getByText("Skip to main content");
    expect(skipLink).toHaveClass("sr-only");
    expect(skipLink).toHaveClass("focus:not-sr-only");
  });

  it("renders header with logo and branding", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByAltText("DriveSafe AI")).toBeInTheDocument();
    expect(screen.getByText("Driver awareness monitor")).toBeInTheDocument();
    expect(screen.getByText("DriveSafe AI")).toBeInTheDocument();
  });

  it("renders navigation and sign out button", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const navigationElements = screen.getAllByText("Navigation");
    expect(navigationElements[0]).toBeInTheDocument(); // Use desktop version
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("renders child routes in main content area", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<div>Test Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Test Page Content")).toBeInTheDocument();
  });
});
