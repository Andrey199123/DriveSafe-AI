import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MonitoringPage from "./MonitoringPage";

// Mock the DrunkDetector component
vi.mock("../DrunkDetector", () => ({
  DrunkDetector: () => <div data-testid="drunk-detector">DrunkDetector Component</div>,
}));

// Mock Convex hooks for authentication testing
let mockUserData: any = null;

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => mockUserData),
}));

// Mock Convex API
vi.mock("../../convex/_generated/api", () => ({
  api: {
    auth: {
      loggedInUser: "mockLoggedInUser",
    },
  },
}));

describe("MonitoringPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserData = null; // Reset to unauthenticated state
  });

  describe("Component Rendering", () => {
    it("renders the DrunkDetector component", () => {
      render(<MonitoringPage />);
      expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
    });

    it("renders without crashing", () => {
      const { container } = render(<MonitoringPage />);
      expect(container).toBeTruthy();
    });
  });

  describe("Content Separation", () => {
    it("should NOT display marketing content", () => {
      render(<MonitoringPage />);
      
      // Verify marketing content is NOT present
      expect(screen.queryByText("Driver awareness, without dashboard noise")).not.toBeInTheDocument();
      expect(screen.queryByText("DriveSafe AI keeps the cabin check clear and motion awareness")).not.toBeInTheDocument();
    });

    it("should display monitoring interface without landing page content", () => {
      render(<MonitoringPage />);
      
      // Verify monitoring interface is present
      expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      
      // Verify landing page elements are NOT present
      expect(screen.queryByText(/Sign in with email/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument();
    });
  });

  describe("Access Control", () => {
    it("should be accessible to authenticated users", () => {
      mockUserData = { email: "test@example.com" };
      
      render(<MonitoringPage />);
      
      // Verify page renders successfully for authenticated users
      expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
    });

    it("should be accessible to unauthenticated users", () => {
      mockUserData = null;
      
      render(<MonitoringPage />);
      
      // Verify page renders successfully for unauthenticated users
      expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
    });

    it("should display full functionality for unauthenticated users", () => {
      mockUserData = null;
      
      const { container } = render(<MonitoringPage />);
      
      // Verify the monitoring interface is fully rendered (not restricted)
      expect(screen.getByTestId("drunk-detector")).toBeInTheDocument();
      expect(container.firstChild).toBeTruthy();
    });
  });
});
