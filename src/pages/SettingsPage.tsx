import { useState, useRef } from "react";
import { useConvex, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { ProviderSelector } from "../components/ProviderSelector";

type UsageProvider = "groq" | "gemini" | "chatgpt";

interface UsageDashboard {
  totals: {
    requestCount: number;
    successCount: number;
    errorCount: number;
    groqRequestCount: number;
    geminiRequestCount: number;
    chatgptRequestCount: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    lastRequestAt: number | null;
  };
  recentEvents: Array<{
    _id: string;
    provider: UsageProvider;
    model: string;
    requestSource: "live_camera" | "uploaded_image" | "uploaded_video" | "stored_image";
    status: "success" | "error";
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    errorMessage?: string;
    timestamp: number;
  }>;
}

export default function SettingsPage() {
  const convex = useConvex();
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usagePassword, setUsagePassword] = useState("");
  const [usageDashboard, setUsageDashboard] = useState<UsageDashboard | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<UsageProvider | "all">("all");
  const usagePasswordRef = useRef("");
  
  // Query current provider settings (not password-protected)
  const currentSettings = useQuery(api.settings.getMySettings);

  const formatRelativeTime = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatProviderName = (provider: UsageProvider) => {
    if (provider === "chatgpt") return "ChatGPT";
    if (provider === "groq") return "Groq";
    return "Gemini";
  };

  // Filter usage data by selected provider
  const filteredTotals = usageDashboard
    ? selectedProvider === "all"
      ? usageDashboard.totals
      : {
          requestCount:
            selectedProvider === "groq"
              ? usageDashboard.totals.groqRequestCount
              : selectedProvider === "gemini"
              ? usageDashboard.totals.geminiRequestCount
              : usageDashboard.totals.chatgptRequestCount,
          successCount: usageDashboard.recentEvents.filter(
            (e) => e.provider === selectedProvider && e.status === "success"
          ).length,
          errorCount: usageDashboard.recentEvents.filter(
            (e) => e.provider === selectedProvider && e.status === "error"
          ).length,
          groqRequestCount: usageDashboard.totals.groqRequestCount,
          geminiRequestCount: usageDashboard.totals.geminiRequestCount,
          chatgptRequestCount: usageDashboard.totals.chatgptRequestCount,
          promptTokens: usageDashboard.recentEvents
            .filter((e) => e.provider === selectedProvider)
            .reduce((sum, e) => sum + (e.promptTokens ?? 0), 0),
          completionTokens: usageDashboard.recentEvents
            .filter((e) => e.provider === selectedProvider)
            .reduce((sum, e) => sum + (e.completionTokens ?? 0), 0),
          totalTokens: usageDashboard.recentEvents
            .filter((e) => e.provider === selectedProvider)
            .reduce((sum, e) => sum + (e.totalTokens ?? 0), 0),
          lastRequestAt: usageDashboard.totals.lastRequestAt,
        }
    : null;

  const filteredEvents = usageDashboard
    ? selectedProvider === "all"
      ? usageDashboard.recentEvents
      : usageDashboard.recentEvents.filter((e) => e.provider === selectedProvider)
    : [];

  const successRate =
    filteredTotals && filteredTotals.requestCount > 0
      ? Math.round((filteredTotals.successCount / filteredTotals.requestCount) * 100)
      : 0;

  const loadUsageDashboard = async (password: string) => {
    setIsUsageLoading(true);
    setUsageError(null);
    try {
      const dashboard = await convex.query(api.usage.getUsageDashboard, { password });
      usagePasswordRef.current = password;
      setUsageDashboard(dashboard as UsageDashboard);
      setUsagePassword("");
      toast.success("Usage dashboard unlocked");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load usage dashboard";
      setUsageError(message);
      toast.error(message);
    } finally {
      setIsUsageLoading(false);
    }
  };

  const handleUsagePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadUsageDashboard(usagePassword);
  };

  const refreshUsageDashboard = () => {
    if (!usagePasswordRef.current) return;
    void loadUsageDashboard(usagePasswordRef.current);
  };

  const lockUsageDashboard = () => {
    usagePasswordRef.current = "";
    setUsageDashboard(null);
    setUsagePassword("");
    setUsageError(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 py-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <span className="site-badge">Usage dashboard</span>
          <h1 className="mt-5 text-5xl font-black leading-none tracking-normal text-[#111827] sm:text-6xl">
            Settings
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Control the active vision provider and audit app-wide API activity from one protected console.
          </p>
        </div>
        <div className="settings-card">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Active provider
          </div>
          <div className="mt-3 text-3xl font-black text-[#111827]">
            {currentSettings?.apiProvider === "chatgpt" ? "ChatGPT API" : "Groq API"}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {currentSettings?.apiProvider === "chatgpt"
              ? "GPT-4o vision is selected for detailed frame interpretation."
              : "Groq/Llama Vision is selected for lower-latency cabin checks."}
          </p>
          <p className="mt-5 border-t border-[#e2e8f0] pt-4 text-sm text-slate-500">
            Unlock usage controls to change the route.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          {!usageDashboard ? (
            <div className="settings-card max-w-lg">
              <div className="mb-6">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                  Usage ledger
                </div>
                <div className="mt-2 text-2xl font-black text-[#111827]">
                  App-wide API request metrics are locked
                </div>
              </div>

              <form onSubmit={handleUsagePasswordSubmit} className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-600">
                  Enter the shared password to open the API usage view.
                </p>
                <input
                  type="password"
                  value={usagePassword}
                  onChange={(event) => setUsagePassword(event.target.value)}
                  className="settings-input"
                  placeholder="Usage dashboard password"
                  required
                />
                <button
                  type="submit"
                  disabled={isUsageLoading}
                  className="settings-button-primary"
                >
                  {isUsageLoading ? "Unlocking dashboard..." : "Unlock dashboard"}
                </button>
                {usageError && (
                  <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                    {usageError}
                  </div>
                )}
              </form>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col gap-4 border-y border-[#e2e8f0] py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                    Usage ledger unlocked
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Last request: {formatRelativeTime(filteredTotals?.lastRequestAt ?? null)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={lockUsageDashboard}
                  className="settings-button-secondary sm:self-end"
                >
                  Lock dashboard
                </button>
              </div>

              <ProviderSelector password={usagePasswordRef.current} />

              {/* Provider Filter */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="provider-filter" className="block sm:min-w-72">
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Provider filter
                  </div>
                  <select
                    id="provider-filter"
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value as UsageProvider | "all")}
                    className="settings-select"
                  >
                    <option value="all">All Providers</option>
                    <option value="groq">Groq Only</option>
                    <option value="gemini">Gemini Only</option>
                    <option value="chatgpt">ChatGPT Only</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={refreshUsageDashboard}
                  disabled={isUsageLoading}
                  className="settings-button-secondary sm:self-end"
                >
                  Refresh
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid overflow-hidden rounded-lg border border-[#dbeafe] bg-[#dbeafe] sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Requests</div>
                  <div className="mt-4 text-5xl font-black text-[#111827]">
                    {filteredTotals?.requestCount ?? 0}
                  </div>
                </div>
                <div className="bg-white p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Success rate</div>
                  <div className="mt-4 text-5xl font-black text-[#2563eb]">
                    {successRate}%
                  </div>
                </div>
                <div className="bg-white p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Tracked tokens</div>
                  <div className="mt-4 text-5xl font-black text-[#111827]">
                    {filteredTotals?.totalTokens ?? 0}
                  </div>
                </div>
                <div className="bg-white p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Errors</div>
                  <div className="mt-4 text-4xl font-black text-[#111827]">
                    {filteredTotals?.errorCount ?? 0}
                  </div>
                </div>
              </div>

              {/* Provider Mix & Token Ledger */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="settings-card">
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Provider mix
                  </div>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-base font-medium text-slate-700">Groq</span>
                      <span className="text-2xl font-black text-[#111827]">{usageDashboard.totals.groqRequestCount}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-base font-medium text-slate-700">Gemini</span>
                      <span className="text-2xl font-black text-[#111827]">{usageDashboard.totals.geminiRequestCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-slate-700">ChatGPT</span>
                      <span className="text-2xl font-black text-[#111827]">{usageDashboard.totals.chatgptRequestCount ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="settings-card">
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Token ledger
                  </div>
                  <div className="mt-6 space-y-3 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Prompt tokens</span>
                      <span className="font-semibold">{filteredTotals?.promptTokens ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion tokens</span>
                      <span className="font-semibold">{filteredTotals?.completionTokens ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Requests */}
              <div className="settings-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Recent requests
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Shared-password view of recent app-wide API activity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshUsageDashboard}
                    disabled={isUsageLoading}
                    className="settings-button-secondary"
                  >
                    Refresh
                  </button>
                </div>

                {filteredEvents.length ? (
                  <div className="mt-8 space-y-4">
                    {filteredEvents.map((event, index) => (
                      <div
                        key={event._id}
                        className="settings-event-card"
                        style={{
                          animationDelay: `${index * 50}ms`
                        }}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <span
                              className={`inline-flex rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${
                                event.status === "success"
                                  ? "bg-[#111827] text-white"
                                  : "bg-red-600 text-white"
                              }`}
                            >
                              {event.status}
                            </span>
                            <span className="text-sm font-medium text-slate-700">
                              {formatProviderName(event.provider)} · {event.requestSource.replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-400">
                            {formatRelativeTime(event.timestamp)}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-600">
                          <span><span className="font-medium">Latency:</span> {event.latencyMs}ms</span>
                          <span><span className="font-medium">Tokens:</span> {event.totalTokens ?? 0}</span>
                          <span><span className="font-medium">Model:</span> {event.model}</span>
                        </div>
                        {event.errorMessage && (
                          <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                            {event.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-8 text-center text-sm text-slate-500">
                    No usage has been recorded yet for this account.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
