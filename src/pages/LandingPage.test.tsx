import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import LandingPage from "./LandingPage";

// Mock Convex hooks with proper conditional rendering
let mockUserData: any = null;

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => mockUserData),
  Authenticated: ({ children }: { children: React.ReactNode }) => {
    // Only render children if user is authenticated (not null and not undefined)
    return mockUserData !== null && mockUserData !== undefined ? <div data-testid="authenticated">{children}</div> : null;
  },
  Unauthenticated: ({ children }: { children: React.ReactNode }) => {
    // Only render children if user is not authenticated (null, but not undefined which is loading)
    return mockUserData === null ? <div data-testid="unauthenticated">{children}</div> : null;
  },
}));

// Mock SignInForm component
vi.mock("../SignInForm", () => ({
  SignInForm: () => <div data-testid="sign-in-form">Sign In Form</div>,
}));

// Mock Convex API
vi.mock("../../convex/_generated/api", () => ({
  api: {
    auth: {
      loggedInUser: "mockLoggedInUser",
    },
  },
}));

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserData = null; // Reset to unauthenticated state
  });

  describe("Marketing Content", () => {
    it("should render the main marketing badge", () => {
      mockUserData = null;

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      expect(screen.getByText("Built for practical, low-distraction driver checks")).toBeInTheDocument();
    });

    it("should render the main headline", () => {
      mockUserData = null;

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      expect(
        screen.getByText("A calmer interface for driver attention and motion awareness.")
      ).toBeInTheDocument();
    });

    it("should render feature cards for unauthenticated users", () => {
      mockUserData = null;

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      // Check for feature card content
      expect(screen.getByText("Camera")).toBeInTheDocument();
      expect(screen.getByText("Live")).toBeInTheDocument();
      expect(screen.getByText("Motion")).toBeInTheDocument();
      expect(screen.getByText("Smoothed")).toBeInTheDocument();
      expect(screen.getByText("Access")).toBeInTheDocument();
      expect(screen.getByText("Flexible")).toBeInTheDocument();
    });
  });

  describe("Unauthenticated User Experience", () => {
    it("should display sign-in form for unauthenticated users", () => {
      mockUserData = null;

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      expect(screen.getByTestId("sign-in-form")).toBeInTheDocument();
    });

    it("should display unauthenticated description text", () => {
      mockUserData = null;

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      expect(
        screen.getByText(/Sign in with email or continue anonymously to test the monitor/i)
      ).toBeInTheDocument();
    });
  });

  describe("Authenticated User Experience", () => {
    it("should display welcome message for authenticated users", () => {
      mockUserData = { email: "test@example.com" };

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/Welcome back, test@example.com/i)).toBeInTheDocument();
    });

    it("should display welcome message for authenticated users without email", () => {
      mockUserData = { email: null };

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/Welcome back\./i)).toBeInTheDocument();
    });

    it("should display authenticated description text", () => {
      mockUserData = { email: "test@example.com" };

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      expect(
        screen.getByText(/Review live camera input, check motion context/i)
      ).toBeInTheDocument();
    });

    it("should NOT display sign-in form for authenticated users", () => {
      mockUserData = { email: "test@example.com" };

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      expect(screen.queryByTestId("sign-in-form")).not.toBeInTheDocument();
    });
  });

  describe("Navigation to Monitoring Page", () => {
    it("should display monitoring page link for authenticated users", () => {
      mockUserData = { email: "test@example.com" };

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      const monitoringLink = screen.getByRole("link", { name: /Go to Monitoring/i });
      expect(monitoringLink).toBeInTheDocument();
      expect(monitoringLink).toHaveAttribute("href", "/monitor");
    });

    it("should NOT display monitoring page link for unauthenticated users", () => {
      mockUserData = null;

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      expect(screen.queryByRole("link", { name: /Go to Monitoring/i })).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should display loading spinner when user data is undefined", () => {
      mockUserData = undefined;

      render(
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      );

      // Check for loading spinner (it has specific animation classes)
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });
});
