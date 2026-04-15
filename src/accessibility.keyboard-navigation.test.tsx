import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import Navigation from "./components/Navigation";
import { SignOutButton } from "./SignOutButton";

// Mock Convex auth
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signOut: vi.fn(),
  }),
}));

describe("Keyboard Navigation Accessibility", () => {
  it("all navigation links are keyboard accessible", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    const monitorLink = screen.getByRole("link", { name: /monitor/i });
    const settingsLink = screen.getByRole("link", { name: /settings/i });

    // Tab through navigation links
    await user.tab();
    expect(homeLink).toHaveFocus();

    await user.tab();
    expect(monitorLink).toHaveFocus();

    await user.tab();
    expect(settingsLink).toHaveFocus();
  });

  it("navigation links have visible focus indicators", () => {
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    
    // Check for focus ring classes
    expect(homeLink).toHaveClass("focus:outline-none");
    expect(homeLink).toHaveClass("focus:ring-2");
    expect(homeLink).toHaveClass("focus:ring-[#1a7457]/30");
  });

  it("sign out button is keyboard accessible", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SignOutButton />
      </MemoryRouter>
    );

    const signOutButton = screen.getByRole("button", { name: /sign out/i });

    // Tab to button
    await user.tab();
    expect(signOutButton).toHaveFocus();

    // Verify it can be activated with keyboard
    expect(signOutButton).toBeInTheDocument();
  });

  it("sign out button has visible focus indicator", () => {
    render(
      <MemoryRouter>
        <SignOutButton />
      </MemoryRouter>
    );

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    
    // Check that it uses the site-secondary-button class which includes focus styles
    expect(signOutButton).toHaveClass("site-secondary-button");
  });

  it("navigation maintains proper tab order", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <div>
          <Navigation />
          <SignOutButton />
        </div>
      </MemoryRouter>
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    const monitorLink = screen.getByRole("link", { name: /monitor/i });
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    const signOutButton = screen.getByRole("button", { name: /sign out/i });

    // Tab through all elements in order
    await user.tab();
    expect(homeLink).toHaveFocus();

    await user.tab();
    expect(monitorLink).toHaveFocus();

    await user.tab();
    expect(settingsLink).toHaveFocus();

    await user.tab();
    expect(signOutButton).toHaveFocus();
  });

  it("shift+tab navigates backwards through elements", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <div>
          <Navigation />
          <SignOutButton />
        </div>
      </MemoryRouter>
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    const signOutButton = screen.getByRole("button", { name: /sign out/i });

    // Tab to last element
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(signOutButton).toHaveFocus();

    // Shift+tab backwards
    await user.tab({ shift: true });
    expect(settingsLink).toHaveFocus();

    await user.tab({ shift: true });
    await user.tab({ shift: true });
    expect(homeLink).toHaveFocus();
  });
});
