import { useState, useRef } from "react";
import { useConvex } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

interface UsageDashboard {
  totals: {
    requestCount: number;
    successCount: number;
    errorCount: number;
    groqRequestCount: number;
    geminiRequestCount: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    lastRequestAt: number | null;
  };
  recentEvents: Array<{
    _id: string;
    provider: "groq" | "gemini";
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
  const usagePasswordRef = useRef("");

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

  const successRate =
    usageDashboard && usageDashboard.totals.requestCount > 0
      ? Math.round(
          (usageDashboard.totals.successCount / usageDashboard.totals.requestCount) * 100,
        )
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
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-[#e8e5de] bg-white shadow-[0_16px_64px_rgba(17,24,39,0.06)]">
        <div className="border-b border-[#e8e5de] px-5 py-6 sm:px-8 sm:py-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-[#f0fdf4] px-4 py-1.5 text-sm font-semibold text-[#1a7457]">
              Settings
            </span>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#111827] sm:text-5xl">
              Shared usage dashboard
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
              Monitoring remains available to anonymous sessions. Usage data stays behind a single shared password.
            </p>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="rounded-[24px] border border-[#e8e5de] bg-[#faf9f5] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Usage access
                </p>
                <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#111827]">
                  App-wide API request metrics
                </p>
              </div>
              {usageDashboard && (
                <button
                  type="button"
                  onClick={lockUsageDashboard}
                  className="inline-flex items-center justify-center rounded-full border border-[#e8e5de] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#1a7457] hover:text-[#1a7457] focus:outline-none focus:ring-2 focus:ring-[#1a7457] focus:ring-offset-2"
                >
                  Lock dashboard
                </button>
              )}
            </div>

            {!usageDashboard ? (
              <form
                onSubmit={handleUsagePasswordSubmit}
                className="mx-auto mt-8 max-w-md rounded-[22px] border border-[#e8e5de] bg-white p-6"
              >
                <p className="text-sm leading-6 text-slate-500">
                  Enter the shared password to open the API usage view.
                </p>
                <input
                  type="password"
                  value={usagePassword}
                  onChange={(event) => setUsagePassword(event.target.value)}
                  className="auth-input-field mt-5"
                  placeholder="Usage dashboard password"
                  required
                />
                <button
                  type="submit"
                  disabled={isUsageLoading}
                  className="auth-button mt-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUsageLoading ? "Unlocking dashboard" : "Unlock dashboard"}
                </button>
                {usageError && (
                  <p className="mt-3 text-sm text-red-600">{usageError}</p>
                )}
              </form>
            ) : (
              <div className="mt-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-[20px] border border-[#e8e5de] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Requests</p>
                    <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111827]">
                      {usageDashboard.totals.requestCount}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[#e8e5de] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Success rate</p>
                    <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#1a7457]">
                      {successRate}%
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[#e8e5de] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tracked tokens</p>
                    <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111827]">
                      {usageDashboard.totals.totalTokens}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[#e8e5de] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Last request</p>
                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#111827]">
                      {formatRelativeTime(usageDashboard.totals.lastRequestAt)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[20px] border border-[#e8e5de] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Provider mix
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Groq</span>
                        <span className="font-semibold">{usageDashboard.totals.groqRequestCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Gemini</span>
                        <span className="font-semibold">{usageDashboard.totals.geminiRequestCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-[#e8e5de] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Failures and tokens
                    </p>
                    <p className="mt-4 text-3xl font-black tracking-[-0.04em] text-red-600">
                      {usageDashboard.totals.errorCount}
                    </p>
                    <p className="mt-3 text-sm text-slate-500">
                      Prompt tokens: {usageDashboard.totals.promptTokens}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Completion tokens: {usageDashboard.totals.completionTokens}
                    </p>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#e8e5de] bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Recent requests
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Shared-password view of recent app-wide API activity.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={refreshUsageDashboard}
                      disabled={isUsageLoading}
                      className="inline-flex items-center justify-center rounded-full border border-[#e8e5de] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#1a7457] hover:text-[#1a7457] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#1a7457] focus:ring-offset-2"
                    >
                      Refresh
                    </button>
                  </div>

                  {usageDashboard.recentEvents.length ? (
                    <div className="mt-5 space-y-3">
                      {usageDashboard.recentEvents.map((event) => (
                        <div
                          key={event._id}
                          className="rounded-[18px] border border-[#e8e5de] bg-[#faf9f5] px-4 py-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                  event.status === "success"
                                    ? "bg-[#f0fdf4] text-[#1a7457]"
                                    : "bg-red-50 text-red-600"
                                }`}
                              >
                                {event.status}
                              </span>
                              <span className="text-sm font-medium text-slate-700">
                                {event.provider.toUpperCase()} · {event.requestSource.replace(/_/g, " ")}
                              </span>
                            </div>
                            <span className="text-sm text-slate-500">
                              {formatRelativeTime(event.timestamp)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                            <span>Latency: {event.latencyMs}ms</span>
                            <span>Tokens: {event.totalTokens ?? 0}</span>
                            <span>Model: {event.model}</span>
                          </div>
                          {event.errorMessage && (
                            <p className="mt-3 text-sm text-red-600">{event.errorMessage}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-slate-500">
                      No usage has been recorded yet for this account.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
