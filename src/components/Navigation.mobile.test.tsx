import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navigation from "./Navigation";

describe("Navigation Mobile Optimizations", () => {
  it("has minimum 44x44px touch targets for all navigation links", () => {
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    const monitorLink = screen.getByRole("link", { name: /monitor/i });
    const settingsLink = screen.getByRole("link", { name: /settings/i });

    // Check that all links have minimum height and width classes
    expect(homeLink).toHaveClass("min-h-[44px]");
    expect(homeLink).toHaveClass("min-w-[44px]");
    expect(monitorLink).toHaveClass("min-h-[44px]");
    expect(monitorLink).toHaveClass("min-w-[44px]");
    expect(settingsLink).toHaveClass("min-h-[44px]");
    expect(settingsLink).toHaveClass("min-w-[44px]");
  });

  it("maintains touch target size with active state", () => {
    render(
      <MemoryRouter initialEntries={["/monitor"]}>
        <Navigation />
      </MemoryRouter>
    );

    const monitorLink = screen.getByRole("link", { name: /monitor/i });
    
    // Active link should still have minimum touch target size
    expect(monitorLink).toHaveClass("min-h-[44px]");
    expect(monitorLink).toHaveClass("min-w-[44px]");
    expect(monitorLink).toHaveClass("bg-[#1a7457]");
  });

  it("has proper spacing between touch targets", () => {
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation");
    // Navigation should have gap-2 class for spacing between links
    expect(nav).toHaveClass("gap-2");
  });

  it("renders with responsive layout classes", () => {
    render(
      <MemoryRouter>
        <Navigation className="flex justify-center" />
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("flex");
    expect(nav).toHaveClass("justify-center");
  });
});
