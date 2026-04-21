import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ProviderSelector } from "./ProviderSelector";

const convexMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  updateProvider: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: convexMocks.useQuery,
  useMutation: () => convexMocks.updateProvider,
}));

vi.mock("../../convex/_generated/api", () => ({
  api: {
    settings: {
      getMySettings: "settings:getMySettings",
      updateApiProvider: "settings:updateApiProvider",
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ProviderSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    convexMocks.useQuery.mockReturnValue({ apiProvider: "groq" });
    convexMocks.updateProvider.mockResolvedValue({ success: true });
  });

  it("displays both Groq and ChatGPT options", () => {
    render(<ProviderSelector password="test-password" />);

    expect(screen.getByText("Groq API")).toBeInTheDocument();
    expect(screen.getByText("Fast inference with Llama Vision")).toBeInTheDocument();
    expect(screen.getByText("ChatGPT API")).toBeInTheDocument();
    expect(screen.getByText("GPT-4o vision analysis through OpenAI")).toBeInTheDocument();
  });

  it("shows the Active badge on the current provider", () => {
    convexMocks.useQuery.mockReturnValue({ apiProvider: "chatgpt" });

    render(<ProviderSelector password="test-password" />);

    const chatgptOption = screen.getByRole("radio", { name: /chatgpt api/i });
    expect(chatgptOption).toBeChecked();
    expect(chatgptOption.closest("label")).toHaveTextContent("Active");
    expect(screen.getByText("Active")).toHaveClass("bg-[#111827]", "text-white");
  });

  it("defaults to Groq when no settings exist yet", () => {
    convexMocks.useQuery.mockReturnValue(null);

    render(<ProviderSelector password="test-password" />);

    expect(screen.getByRole("radio", { name: /groq api/i })).toBeChecked();
  });

  it("clicking Groq calls the mutation with groq when ChatGPT is current", async () => {
    const user = userEvent.setup();
    convexMocks.useQuery.mockReturnValue({ apiProvider: "chatgpt" });

    render(<ProviderSelector password="test-password" />);
    await user.click(screen.getByRole("radio", { name: /groq api/i }));

    expect(convexMocks.updateProvider).toHaveBeenCalledWith({
      password: "test-password",
      apiProvider: "groq",
    });
  });

  it("clicking ChatGPT calls the mutation with chatgpt when Groq is current", async () => {
    const user = userEvent.setup();

    render(<ProviderSelector password="test-password" />);
    await user.click(screen.getByRole("radio", { name: /chatgpt api/i }));

    expect(convexMocks.updateProvider).toHaveBeenCalledWith({
      password: "test-password",
      apiProvider: "chatgpt",
    });
  });

  it("clicking the current provider does not trigger the mutation", async () => {
    const user = userEvent.setup();

    render(<ProviderSelector password="test-password" />);
    await user.click(screen.getByRole("radio", { name: /groq api/i }));

    expect(convexMocks.updateProvider).not.toHaveBeenCalled();
  });

  it("shows a success toast after updating providers", async () => {
    const user = userEvent.setup();

    render(<ProviderSelector password="test-password" />);
    await user.click(screen.getByRole("radio", { name: /chatgpt api/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Switched to ChatGPT API");
    });
  });

  it("shows an error toast when provider update fails", async () => {
    const user = userEvent.setup();
    convexMocks.updateProvider.mockRejectedValueOnce(new Error("Incorrect password"));

    render(<ProviderSelector password="test-password" />);
    await user.click(screen.getByRole("radio", { name: /chatgpt api/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Incorrect password");
    });
  });

  it("disables provider radios while an update is pending", async () => {
    const user = userEvent.setup();
    let resolveUpdate: (value: { success: true }) => void = () => {};
    convexMocks.updateProvider.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    render(<ProviderSelector password="test-password" />);
    await user.click(screen.getByRole("radio", { name: /chatgpt api/i }));

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /groq api/i })).toBeDisabled();
      expect(screen.getByRole("radio", { name: /chatgpt api/i })).toBeDisabled();
      expect(screen.getByText("Saving provider...")).toBeInTheDocument();
    });

    resolveUpdate({ success: true });
  });

  it("uses new design theme classes for the selector and controls", () => {
    render(<ProviderSelector password="test-password" />);

    expect(screen.getByTestId("provider-selector")).toHaveClass("settings-card");
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveClass("text-[#111827]", "focus:ring-[#111827]");
      expect(radio.closest("label")).toHaveClass("hover:border-[#111827]");
    }
  });
});
