import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface ProviderSelectorProps {
  password: string;
}

type ApiProvider = "groq" | "chatgpt";

const providerCopy: Record<ApiProvider, { name: string; detail: string; stance: string }> = {
  groq: {
    name: "Groq API",
    detail: "Llama Vision",
    stance: "Latency-first route for quick cabin checks",
  },
  chatgpt: {
    name: "ChatGPT API",
    detail: "GPT-4o Vision",
    stance: "Detail-first route for richer scene interpretation",
  },
};

export function ProviderSelector({ password }: ProviderSelectorProps) {
  const settings = useQuery(api.settings.getMySettings);
  const updateProvider = useMutation(api.settings.updateApiProvider);
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticProvider, setOptimisticProvider] = useState<ApiProvider | null>(null);

  const persistedProvider = settings?.apiProvider ?? "groq";
  const currentProvider = optimisticProvider ?? persistedProvider;

  useEffect(() => {
    if (optimisticProvider && settings?.apiProvider === optimisticProvider) {
      setOptimisticProvider(null);
    }
  }, [optimisticProvider, settings?.apiProvider]);

  const handleProviderChange = async (provider: ApiProvider) => {
    if (provider === currentProvider) return;

    setIsUpdating(true);
    try {
      await updateProvider({
        password,
        apiProvider: provider,
      });
      setOptimisticProvider(provider);
      toast.success(`Switched to ${providerCopy[provider].name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update provider";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div data-testid="provider-selector" className="settings-card">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-start">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
            Analysis routing
          </div>
          <div className="mt-2 text-2xl font-black text-[#111827]">
            Choose the vision engine
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This setting changes the provider used by the next frame analysis.
          </p>
        </div>
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-2" disabled={isUpdating}>
        <legend className="sr-only">AI analysis provider</legend>
        {(Object.keys(providerCopy) as ApiProvider[]).map((provider) => {
          const isActive = currentProvider === provider;
          return (
            <label
              key={provider}
              className={`relative cursor-pointer rounded-lg border bg-white p-4 transition-colors ${
                isUpdating
                  ? "cursor-wait opacity-70"
                  : "hover:border-[#2563eb] hover:bg-[#eff6ff]"
              } ${isActive ? "border-[#2563eb] bg-[#eff6ff]" : "border-[#dbeafe]"}`}
            >
              <input
                type="radio"
                name="provider"
                value={provider}
                checked={isActive}
                onChange={() => handleProviderChange(provider)}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-base font-black text-[#111827]">
                    {providerCopy[provider].name}
                  </span>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {providerCopy[provider].detail}
                  </span>
                </span>
                {isActive && (
                  <span className="rounded-md bg-[#2563eb] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                    Active route
                  </span>
                )}
              </span>
              <span className="mt-4 block text-sm leading-6 text-slate-600">
                {providerCopy[provider].stance}
              </span>
            </label>
          );
        })}
      </fieldset>

      {isUpdating && (
        <div className="mt-4 text-sm font-medium text-[#111827]">Saving provider route...</div>
      )}
    </div>
  );
}
