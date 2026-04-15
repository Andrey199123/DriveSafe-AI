import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import Navigation from "./Navigation";

describe("Navigation Component", () => {
  it("renders all three navigation links", () => {
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /monitor/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  it("links to correct routes", () => {
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    const monitorLink = screen.getByRole("link", { name: /monitor/i });
    const settingsLink = screen.getByRole("link", { name: /settings/i });

    expect(homeLink).toHaveAttribute("href", "/");
    expect(monitorLink).toHaveAttribute("href", "/monitor");
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("applies active styles to current route", () => {
    render(
      <MemoryRouter initialEntries={["/monitor"]}>
        <Navigation />
      </MemoryRouter>
    );

    const monitorLink = screen.getByRole("link", { name: /monitor/i });
    expect(monitorLink).toHaveClass("bg-[#1a7457]");
    expect(monitorLink).toHaveClass("text-white");
  });

  it("applies inactive styles to non-current routes", () => {
    render(
      <MemoryRouter initialEntries={["/monitor"]}>
        <Navigation />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink).toHaveClass("bg-white");
    expect(homeLink).toHaveClass("text-slate-600");
  });

  it("has keyboard accessible focus styles", () => {
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink).toHaveClass("focus:outline-none");
    expect(homeLink).toHaveClass("focus:ring-2");
  });

  it("has proper ARIA label for navigation", () => {
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveAttribute("aria-label", "Main navigation");
  });

  it("accepts custom className prop", () => {
    render(
      <MemoryRouter>
        <Navigation className="custom-class" />
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("custom-class");
  });

  it("navigates when links are clicked", async () => {
    const user = userEvent.setup();
    let currentPath = "/";

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={
            <>
              <Navigation />
              <div data-testid="current-page">Home Page</div>
            </>
          } />
          <Route path="/monitor" element={
            <>
              <Navigation />
              <div data-testid="current-page">Monitor Page</div>
            </>
          } />
          <Route path="/settings" element={
            <>
              <Navigation />
              <div data-testid="current-page">Settings Page</div>
            </>
          } />
        </Routes>
      </MemoryRouter>
    );

    // Initially on home page
    expect(screen.getByTestId("current-page")).toHaveTextContent("Home Page");

    // Click monitor link
    const monitorLink = screen.getByRole("link", { name: /monitor/i });
    await user.click(monitorLink);
    expect(screen.getByTestId("current-page")).toHaveTextContent("Monitor Page");

    // Click settings link
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    await user.click(settingsLink);
    expect(screen.getByTestId("current-page")).toHaveTextContent("Settings Page");

    // Click home link
    const homeLink = screen.getByRole("link", { name: /home/i });
    await user.click(homeLink);
    expect(screen.getByTestId("current-page")).toHaveTextContent("Home Page");
  });

  it("can be navigated with keyboard", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={
            <>
              <Navigation />
              <div data-testid="current-page">Home Page</div>
            </>
          } />
          <Route path="/monitor" element={
            <>
              <Navigation />
              <div data-testid="current-page">Monitor Page</div>
            </>
          } />
        </Routes>
      </MemoryRouter>
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    const monitorLink = screen.getByRole("link", { name: /monitor/i });

    // Tab to first link (home)
    await user.tab();
    expect(homeLink).toHaveFocus();

    // Tab to second link (monitor)
    await user.tab();
    expect(monitorLink).toHaveFocus();

    // Press Enter to navigate
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("current-page")).toHaveTextContent("Monitor Page");
  });
});
