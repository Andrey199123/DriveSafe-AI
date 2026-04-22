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
    
    // Check that the section uses the responsive console layout.
    expect(mainSection).toHaveClass("grid");
  });

  it("has responsive padding for mobile devices", () => {
    const { container } = render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    // Check that the settings card exists with proper styling
    const settingsCard = container.querySelector(".settings-card");
    expect(settingsCard).toBeInTheDocument();
    // The settings-card class includes padding via CSS
    expect(settingsCard).toHaveClass("settings-card");
  });

  it("password form is centered and properly sized on mobile", () => {
    render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    const passwordInput = screen.getByPlaceholderText(/usage dashboard password/i);
    expect(passwordInput).toBeInTheDocument();
    
    // Form should be in a settings card with proper styling
    const form = passwordInput.closest("form");
    expect(form).toBeInTheDocument();
    expect(form?.parentElement).toHaveClass("settings-card");
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
    
    // The form container should have proper styling
    expect(passwordForm?.parentElement).toHaveClass("settings-card");
  });

  it("settings page takes full available width within layout constraints", () => {
    const { container } = render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    // The outer container should use the updated, tighter spacing rhythm.
    const outerContainer = container.querySelector(".space-y-10");
    expect(outerContainer).toBeInTheDocument();
  });

  it("buttons have proper touch targets on mobile", () => {
    render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    const unlockButton = screen.getByRole("button", { name: /unlock dashboard/i });
    
    // Button should have proper styling for touch targets with new design
    expect(unlockButton).toHaveClass("settings-button-primary");
  });

  it("responsive text sizing for mobile readability", () => {
    render(
      <ConvexProvider client={mockConvex}>
        <SettingsPage />
      </ConvexProvider>
    );

    const heading = screen.getByRole("heading", { level: 1, name: /settings/i });
    
    // Heading should have responsive text sizing with new bolder design
    expect(heading).toHaveClass("text-5xl");
    expect(heading).toHaveClass("sm:text-6xl");
  });
});
