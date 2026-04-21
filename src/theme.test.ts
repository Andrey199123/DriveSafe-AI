import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Theme System - Blue Color Theme", () => {
  describe("CSS Custom Properties", () => {
    let cssContent: string;

    beforeEach(() => {
      // Read the actual CSS file
      const cssPath = resolve(__dirname, "index.css");
      cssContent = readFileSync(cssPath, "utf-8");
    });

    it("should define --app-accent with blue color value", () => {
      expect(cssContent).toContain("--app-accent: #2563eb");
    });

    it("should define --app-accent-soft with light blue color value", () => {
      expect(cssContent).toContain("--app-accent-soft: #eff6ff");
    });

    it("should define --app-border with blue-gray color value", () => {
      expect(cssContent).toContain("--app-border: #e2e8f0");
    });

    it("should define --app-bg with light blue-gray background", () => {
      expect(cssContent).toContain("--app-bg: #f8fafc");
    });

    it("should use blue color in radial gradient background", () => {
      // Verify the gradient uses blue (37, 99, 235 is #2563eb in RGB)
      expect(cssContent).toMatch(/rgba\(37,\s*99,\s*235,\s*0\.06\)/);
    });

    it("should not contain any green color values in custom properties", () => {
      // Check that old green colors are not present
      const greenColorPatterns = [
        /#10b981/i, // emerald-500
        /#059669/i, // emerald-600
        /#047857/i, // emerald-700
        /#1a7457/i, // custom green
      ];

      greenColorPatterns.forEach((pattern) => {
        expect(cssContent).not.toMatch(pattern);
      });
    });
  });

  describe("Component CSS Classes", () => {
    let cssContent: string;

    beforeEach(() => {
      const cssPath = resolve(__dirname, "index.css");
      cssContent = readFileSync(cssPath, "utf-8");
    });

    it("should apply blue text color to .site-eyebrow class", () => {
      expect(cssContent).toMatch(/\.site-eyebrow[\s\S]*?text-\[#2563eb\]/);
    });

    it("should apply light blue background and blue text to .site-badge class", () => {
      const badgeClassMatch = cssContent.match(/\.site-badge\s*\{[^}]*\}/s);
      expect(badgeClassMatch).toBeTruthy();
      
      const badgeClass = badgeClassMatch![0];
      expect(badgeClass).toContain("bg-[#eff6ff]");
      expect(badgeClass).toContain("text-[#2563eb]");
    });

    it("should apply blue focus ring to .site-primary-button class", () => {
      const buttonClassMatch = cssContent.match(/\.site-primary-button\s*\{[^}]*\}/s);
      expect(buttonClassMatch).toBeTruthy();
      
      const buttonClass = buttonClassMatch![0];
      expect(buttonClass).toContain("focus:ring-[#2563eb]");
    });

    it("should apply blue hover and focus states to .site-secondary-button class", () => {
      const secondaryButtonMatch = cssContent.match(/\.site-secondary-button\s*\{[^}]*\}/s);
      expect(secondaryButtonMatch).toBeTruthy();
      
      const secondaryButton = secondaryButtonMatch![0];
      expect(secondaryButton).toContain("hover:border-[#2563eb]");
      expect(secondaryButton).toContain("hover:text-[#2563eb]");
      expect(secondaryButton).toContain("focus:ring-[#2563eb]");
    });

    it("should apply blue focus border and ring to .auth-input-field class", () => {
      const authInputMatch = cssContent.match(/\.auth-input-field\s*\{[^}]*\}/s);
      expect(authInputMatch).toBeTruthy();
      
      const authInput = authInputMatch![0];
      expect(authInput).toContain("focus:border-[#2563eb]");
      expect(authInput).toContain("focus:ring-[#2563eb]/10");
    });

    it("should apply blue focus ring to .auth-button class", () => {
      const authButtonMatch = cssContent.match(/\.auth-button\s*\{[^}]*\}/s);
      expect(authButtonMatch).toBeTruthy();
      
      const authButton = authButtonMatch![0];
      expect(authButton).toContain("focus:ring-[#2563eb]");
    });
  });

  describe("Tailwind Configuration", () => {
    let configContent: string;

    beforeEach(() => {
      // Read the Tailwind config file as text
      const configPath = resolve(__dirname, "../tailwind.config.js");
      configContent = readFileSync(configPath, "utf-8");
    });

    it("should define primary.DEFAULT color as blue", () => {
      // Check for the color definition in the config file
      expect(configContent).toMatch(/primary:\s*\{[\s\S]*?DEFAULT:\s*["']#2563eb["']/);
    });

    it("should define primary.hover color as darker blue", () => {
      expect(configContent).toMatch(/primary:\s*\{[\s\S]*?hover:\s*["']#1d4ed8["']/);
    });

    it("should define accent.DEFAULT color as blue", () => {
      expect(configContent).toMatch(/accent:\s*\{[\s\S]*?DEFAULT:\s*["']#2563eb["']/);
    });

    it("should define accent.hover color as darker blue", () => {
      expect(configContent).toMatch(/accent:\s*\{[\s\S]*?hover:\s*["']#1d4ed8["']/);
    });

    it("should not contain green color values in theme colors", () => {
      // Check that old green colors are not present in the colors section
      const colorsMatch = configContent.match(/colors:\s*\{[\s\S]*?\},/);
      if (colorsMatch) {
        const colorsSection = colorsMatch[0];
        expect(colorsSection).not.toContain("#10b981"); // emerald-500
        expect(colorsSection).not.toContain("#059669"); // emerald-600
        expect(colorsSection).not.toContain("#047857"); // emerald-700
      }
    });
  });

  describe("Theme Consistency", () => {
    it("should use consistent blue color values across CSS and Tailwind", () => {
      const cssPath = resolve(__dirname, "index.css");
      const cssContent = readFileSync(cssPath, "utf-8");
      
      const configPath = resolve(__dirname, "../tailwind.config.js");
      const configContent = readFileSync(configPath, "utf-8");
      
      // Primary blue color should be consistent
      const primaryBlue = "#2563eb";
      expect(cssContent).toContain(primaryBlue);
      expect(configContent).toContain(primaryBlue);
      
      // Darker blue should be consistent
      const darkerBlue = "#1d4ed8";
      expect(configContent).toContain(darkerBlue);
    });

    it("should use light blue background color consistently", () => {
      const cssPath = resolve(__dirname, "index.css");
      const cssContent = readFileSync(cssPath, "utf-8");
      
      const lightBlue = "#eff6ff";
      expect(cssContent).toContain(lightBlue);
    });
  });
});
