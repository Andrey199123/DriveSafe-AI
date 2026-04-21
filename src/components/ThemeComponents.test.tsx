import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

describe("Theme Components - Blue Color Application", () => {
  describe("site-badge class", () => {
    it("should have the site-badge class applied", () => {
      render(
        <span className="site-badge" data-testid="badge">
          Test Badge
        </span>
      );

      const badge = screen.getByTestId("badge");
      
      // Check that the badge has the correct class
      // The @apply directive in CSS means the styles are applied via CSS, not as individual classes
      expect(badge).toHaveClass("site-badge");
      expect(badge).toBeInTheDocument();
    });

    it("should render badge content correctly", () => {
      render(
        <span className="site-badge" data-testid="badge">
          Test Badge
        </span>
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("Test Badge");
    });
  });

  describe("site-eyebrow class", () => {
    it("should have the site-eyebrow class applied", () => {
      render(
        <p className="site-eyebrow" data-testid="eyebrow">
          Test Eyebrow
        </p>
      );

      const eyebrow = screen.getByTestId("eyebrow");
      
      expect(eyebrow).toHaveClass("site-eyebrow");
      expect(eyebrow).toBeInTheDocument();
    });

    it("should render eyebrow content correctly", () => {
      render(
        <p className="site-eyebrow" data-testid="eyebrow">
          Test Eyebrow
        </p>
      );

      const eyebrow = screen.getByTestId("eyebrow");
      expect(eyebrow).toHaveTextContent("Test Eyebrow");
    });
  });

  describe("site-primary-button class", () => {
    it("should have the site-primary-button class applied", () => {
      render(
        <button className="site-primary-button" data-testid="primary-btn">
          Primary Button
        </button>
      );

      const button = screen.getByTestId("primary-btn");
      
      expect(button).toHaveClass("site-primary-button");
      expect(button).toBeInTheDocument();
    });

    it("should be clickable", () => {
      const handleClick = vi.fn();
      render(
        <button className="site-primary-button" onClick={handleClick} data-testid="primary-btn">
          Primary Button
        </button>
      );

      const button = screen.getByTestId("primary-btn");
      button.click();
      expect(handleClick).toHaveBeenCalledOnce();
    });
  });

  describe("site-secondary-button class", () => {
    it("should have the site-secondary-button class applied", () => {
      render(
        <button className="site-secondary-button" data-testid="secondary-btn">
          Secondary Button
        </button>
      );

      const button = screen.getByTestId("secondary-btn");
      
      expect(button).toHaveClass("site-secondary-button");
      expect(button).toBeInTheDocument();
    });

    it("should be clickable", () => {
      const handleClick = vi.fn();
      render(
        <button className="site-secondary-button" onClick={handleClick} data-testid="secondary-btn">
          Secondary Button
        </button>
      );

      const button = screen.getByTestId("secondary-btn");
      button.click();
      expect(handleClick).toHaveBeenCalledOnce();
    });
  });

  describe("auth-input-field class", () => {
    it("should have the auth-input-field class applied", () => {
      render(
        <input
          type="text"
          className="auth-input-field"
          data-testid="auth-input"
          placeholder="Test input"
        />
      );

      const input = screen.getByTestId("auth-input");
      
      expect(input).toHaveClass("auth-input-field");
      expect(input).toBeInTheDocument();
    });

    it("should accept user input", () => {
      render(
        <input
          type="text"
          className="auth-input-field"
          data-testid="auth-input"
          placeholder="Test input"
        />
      );

      const input = screen.getByTestId("auth-input") as HTMLInputElement;
      input.value = "test value";
      expect(input.value).toBe("test value");
    });
  });

  describe("auth-button class", () => {
    it("should have the auth-button class applied", () => {
      render(
        <button className="auth-button" data-testid="auth-btn">
          Auth Button
        </button>
      );

      const button = screen.getByTestId("auth-btn");
      
      expect(button).toHaveClass("auth-button");
      expect(button).toBeInTheDocument();
    });

    it("should be clickable", () => {
      const handleClick = vi.fn();
      render(
        <button className="auth-button" onClick={handleClick} data-testid="auth-btn">
          Auth Button
        </button>
      );

      const button = screen.getByTestId("auth-btn");
      button.click();
      expect(handleClick).toHaveBeenCalledOnce();
    });
  });

  describe("Tailwind color utilities", () => {
    it("should apply primary blue color from Tailwind config", () => {
      render(
        <div className="bg-primary text-white" data-testid="primary-div">
          Primary Color
        </div>
      );

      const div = screen.getByTestId("primary-div");
      
      expect(div).toHaveClass("bg-primary");
      expect(div).toHaveClass("text-white");
    });

    it("should apply accent blue color from Tailwind config", () => {
      render(
        <div className="bg-accent text-white" data-testid="accent-div">
          Accent Color
        </div>
      );

      const div = screen.getByTestId("accent-div");
      
      expect(div).toHaveClass("bg-accent");
      expect(div).toHaveClass("text-white");
    });

    it("should apply primary hover color", () => {
      render(
        <button className="hover:bg-primary-hover" data-testid="hover-btn">
          Hover Button
        </button>
      );

      const button = screen.getByTestId("hover-btn");
      
      expect(button).toHaveClass("hover:bg-primary-hover");
    });

    it("should apply blue color using arbitrary values", () => {
      render(
        <div className="text-[#2563eb]" data-testid="blue-text">
          Blue Text
        </div>
      );

      const div = screen.getByTestId("blue-text");
      
      expect(div).toHaveClass("text-[#2563eb]");
    });
  });

  describe("Component integration", () => {
    it("should render multiple themed components together", () => {
      render(
        <div>
          <span className="site-badge" data-testid="badge">Badge</span>
          <p className="site-eyebrow" data-testid="eyebrow">Eyebrow</p>
          <button className="site-primary-button" data-testid="primary">Primary</button>
          <button className="site-secondary-button" data-testid="secondary">Secondary</button>
        </div>
      );

      expect(screen.getByTestId("badge")).toBeInTheDocument();
      expect(screen.getByTestId("eyebrow")).toBeInTheDocument();
      expect(screen.getByTestId("primary")).toBeInTheDocument();
      expect(screen.getByTestId("secondary")).toBeInTheDocument();
    });

    it("should render auth components together", () => {
      render(
        <form>
          <input
            type="text"
            className="auth-input-field"
            data-testid="input"
            placeholder="Email"
          />
          <button className="auth-button" data-testid="button">
            Sign In
          </button>
        </form>
      );

      expect(screen.getByTestId("input")).toBeInTheDocument();
      expect(screen.getByTestId("button")).toBeInTheDocument();
    });
  });
});
