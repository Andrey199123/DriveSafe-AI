import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DrunkDetector } from "./DrunkDetector";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useAction: vi.fn(() => vi.fn().mockResolvedValue({
    isDrunk: false,
    isSleepy: false,
    isDistracted: false,
    confidence: 85,
    indicators: [],
    state: "normal",
  })),
}));

// Mock Convex API
vi.mock("../convex/_generated/api", () => ({
  api: {
    ai: {
      analyzeFrame: "mockAnalyzeFrame",
    },
  },
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(() => 1),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, "geolocation", {
  value: mockGeolocation,
  writable: true,
  configurable: true,
});

// Mock getUserMedia
const mockGetUserMedia = vi.fn();
const mockMediaDevices = {
  getUserMedia: mockGetUserMedia,
};

Object.defineProperty(global.navigator, "mediaDevices", {
  value: mockMediaDevices,
  writable: true,
  configurable: true,
});

describe("DrunkDetector - Cleanup Verification (Task 9.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Settings Modal Removal", () => {
    it("should NOT render a settings button", () => {
      render(<DrunkDetector />);
      
      // Verify no settings button exists
      expect(screen.queryByRole("button", { name: /settings/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/settings/i)).not.toBeInTheDocument();
    });

    it("should NOT render a settings modal", () => {
      render(<DrunkDetector />);
      
      // Verify no modal-related elements exist
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByText(/usage dashboard/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
    });

    it("should NOT have settings-related state or functionality", () => {
      const { container } = render(<DrunkDetector />);
      
      // Verify no settings-related UI elements
      const settingsElements = container.querySelectorAll('[class*="settings"]');
      expect(settingsElements.length).toBe(0);
      
      // Verify no modal overlays
      const modalElements = container.querySelectorAll('[class*="modal"]');
      expect(modalElements.length).toBe(0);
    });
  });

  describe("Core Monitoring Functionality", () => {
    it("should render the monitoring interface", () => {
      render(<DrunkDetector />);
      
      expect(screen.getByText(/Cabin monitor/i)).toBeInTheDocument();
      const liveMonitoringElements = screen.getAllByText(/Live monitoring/i);
      expect(liveMonitoringElements.length).toBeGreaterThan(0);
    });

    it("should display the start monitoring button", () => {
      render(<DrunkDetector />);
      
      const startButton = screen.getByRole("button", { name: /start monitoring/i });
      expect(startButton).toBeInTheDocument();
    });

    it("should display the upload media button", () => {
      render(<DrunkDetector />);
      
      const uploadButton = screen.getByRole("button", { name: /upload media/i });
      expect(uploadButton).toBeInTheDocument();
    });

    it("should display speed tracking information", () => {
      render(<DrunkDetector />);
      
      const speedElements = screen.getAllByText(/Speed/i);
      expect(speedElements.length).toBeGreaterThan(0);
      const mphElements = screen.getAllByText(/mph/i);
      expect(mphElements.length).toBeGreaterThan(0);
    });

    it("should display detection result cards", () => {
      render(<DrunkDetector />);
      
      expect(screen.getByText(/Alcohol cues/i)).toBeInTheDocument();
      expect(screen.getByText(/Drowsiness/i)).toBeInTheDocument();
      expect(screen.getByText(/Attention/i)).toBeInTheDocument();
    });

    it("should display current assessment section", () => {
      render(<DrunkDetector />);
      
      expect(screen.getAllByText(/^Assessment$/i).length).toBeGreaterThan(0);
      const waitingElements = screen.getAllByText(/Waiting to begin/i);
      expect(waitingElements.length).toBeGreaterThan(0);
    });
  });

  describe("Video and Camera Functionality", () => {
    it("should render video element for camera feed", () => {
      const { container } = render(<DrunkDetector />);
      
      const videoElement = container.querySelector("video");
      expect(videoElement).toBeInTheDocument();
    });

    it("should render canvas element for frame capture", () => {
      const { container } = render(<DrunkDetector />);
      
      const canvasElement = container.querySelector("canvas");
      expect(canvasElement).toBeInTheDocument();
      expect(canvasElement).toHaveClass("hidden");
    });

    it("should have file input for media upload", () => {
      const { container } = render(<DrunkDetector />);
      
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute("accept", "video/*,image/*");
    });
  });

  describe("UI Layout and Structure", () => {
    it("should display mode information cards", () => {
      render(<DrunkDetector />);
      
      expect(screen.getByText(/Mode/i)).toBeInTheDocument();
      expect(screen.getByText(/Manual start/i)).toBeInTheDocument();
    });

    it("should display driver notes section", () => {
      render(<DrunkDetector />);
      
      expect(screen.getByText(/Operating note/i)).toBeInTheDocument();
      expect(screen.getByText(/Keep your eyes on the road/i)).toBeInTheDocument();
    });

    it("should display snapshot section with result cards", () => {
      render(<DrunkDetector />);
      
      expect(screen.getByText(/Signal map/i)).toBeInTheDocument();
      
      // Verify all three result cards are present
      const alcoholCues = screen.getAllByText(/Alcohol cues/i);
      const drowsiness = screen.getAllByText(/Drowsiness/i);
      const attention = screen.getAllByText(/Attention/i);
      
      expect(alcoholCues.length).toBeGreaterThan(0);
      expect(drowsiness.length).toBeGreaterThan(0);
      expect(attention.length).toBeGreaterThan(0);
    });
  });

  describe("Content Separation Verification", () => {
    it("should NOT display landing page content", () => {
      render(<DrunkDetector />);
      
      // Verify no landing page marketing content
      expect(screen.queryByText(/Driver awareness, without dashboard noise/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/DriveSafe AI keeps the cabin check clear and motion awareness/i)).not.toBeInTheDocument();
    });

    it("should NOT display sign-in controls", () => {
      render(<DrunkDetector />);
      
      // Verify no authentication UI
      expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
    });

    it("should focus exclusively on monitoring functionality", () => {
      const { container } = render(<DrunkDetector />);
      
      // Verify the component contains monitoring-specific content
      expect(screen.getByText(/Cabin monitor/i)).toBeInTheDocument();
      const liveMonitoringElements = screen.getAllByText(/Live monitoring/i);
      expect(liveMonitoringElements.length).toBeGreaterThan(0);
      
      // Verify no navigation elements (those should be in RootLayout)
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
      expect(screen.queryByText(/home/i)).not.toBeInTheDocument();
    });
  });

  describe("Interaction Functionality", () => {
    it("should allow clicking upload media button", async () => {
      const user = userEvent.setup();
      render(<DrunkDetector />);
      
      const uploadButton = screen.getByRole("button", { name: /upload media/i });
      await user.click(uploadButton);
      
      // Button should be clickable without errors
      expect(uploadButton).toBeInTheDocument();
    });

    it("should display proper button states", () => {
      render(<DrunkDetector />);
      
      const startButton = screen.getByRole("button", { name: /start monitoring/i });
      expect(startButton).not.toBeDisabled();
      
      const uploadButton = screen.getByRole("button", { name: /upload media/i });
      expect(uploadButton).not.toBeDisabled();
    });
  });

  describe("Component Stability After Cleanup", () => {
    it("should render without crashing", () => {
      const { container } = render(<DrunkDetector />);
      expect(container).toBeTruthy();
      expect(container.firstChild).toBeTruthy();
    });

    it("should not throw errors during render", () => {
      expect(() => render(<DrunkDetector />)).not.toThrow();
    });

    it("should maintain proper component structure", () => {
      const { container } = render(<DrunkDetector />);
      
      // Verify main sections exist
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThan(0);
      
      // Verify proper nesting
      const mainDiv = container.querySelector("div.space-y-8");
      expect(mainDiv).toBeInTheDocument();
    });
  });
});
