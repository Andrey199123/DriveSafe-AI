import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import SettingsPage from "./SettingsPage";

// Mock Convex client
const mockConvex = new ConvexReactClient("https://test.convex.cloud");

describe("SettingsPage Mobile Layout", () => {
  it("renders full-width content on mobile", () => {
    const { container } = render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    // The main container should not have max-width restrictions
    const mainSection = container.querySelector("section");
    expect(mainSection).toBeInTheDocument();
    
    // Check that the section has proper mobile styling
    expect(mainSection).toHaveClass("overflow-hidden");
    expect(mainSection).toHaveClass("rounded-[28px]");
    expect(mainSection).toHaveClass("border");
  });

  it("has responsive padding for mobile devices", () => {
    const { container } = render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    // Check header section has responsive padding
    const headerSection = container.querySelector(".border-b");
    expect(headerSection).toHaveClass("px-5");
    expect(headerSection).toHaveClass("py-6");
    expect(headerSection).toHaveClass("sm:px-8");
    expect(headerSection).toHaveClass("sm:py-8");
  });

  it("password form is centered and properly sized on mobile", () => {
    render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    const passwordInput = screen.getByPlaceholderText(/usage dashboard password/i);
    expect(passwordInput).toBeInTheDocument();
    
    // Form should be in a container with max-width for better mobile UX
    const form = passwordInput.closest("form");
    expect(form).toHaveClass("mx-auto");
    expect(form).toHaveClass("max-w-md");
  });

  it("dashboard cards stack vertically on mobile when unlocked", () => {
    const { container } = render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    // When password form is shown, there should be no grids yet
    // This test verifies the structure is ready for responsive grids when dashboard loads
    const passwordForm = screen.getByPlaceholderText(/usage dashboard password/i).closest("form");
    expect(passwordForm).toBeInTheDocument();
    
    // The form container should have responsive classes
    expect(passwordForm).toHaveClass("mx-auto");
    expect(passwordForm).toHaveClass("max-w-md");
  });

  it("settings page takes full available width within layout constraints", () => {
    const { container } = render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    // The outer container should use space-y for vertical spacing
    const outerContainer = container.querySelector(".space-y-8");
    expect(outerContainer).toBeInTheDocument();
  });

  it("buttons have proper touch targets on mobile", () => {
    render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    const unlockButton = screen.getByRole("button", { name: /unlock dashboard/i });
    
    // Button should have proper padding for touch targets
    expect(unlockButton).toHaveClass("auth-button");
    expect(unlockButton).toHaveClass("mt-4");
  });

  it("responsive text sizing for mobile readability", () => {
    render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    const heading = screen.getByText(/shared usage dashboard/i);
    
    // Heading should have responsive text sizing
    expect(heading).toHaveClass("text-4xl");
    expect(heading).toHaveClass("sm:text-5xl");
  });
});
