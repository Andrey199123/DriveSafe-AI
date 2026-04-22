import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface ProviderSelectorProps {
  password: string;
}

type ApiProvider = "groq" | "chatgpt";

const providerCopy: Record<ApiProvider, { name: string; detail: string }> = {
  groq: {
    name: "Groq API",
    detail: "Fast inference with Llama Vision",
  },
  chatgpt: {
    name: "ChatGPT API",
    detail: "GPT-4o vision analysis through OpenAI",
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
      <div className="mb-6">
        <div className="text-sm font-medium uppercase tracking-wider text-slate-400">
          API Provider
        </div>
        <div className="mt-2 text-2xl font-black text-[#111827]">
          Select AI analysis provider
        </div>
      </div>

      <fieldset className="space-y-4" disabled={isUpdating}>
        <legend className="sr-only">AI analysis provider</legend>
        {(Object.keys(providerCopy) as ApiProvider[]).map((provider) => {
          const isActive = currentProvider === provider;
          return (
            <label
              key={provider}
              className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 bg-white p-5 transition-all ${
                isUpdating
                  ? "cursor-wait opacity-70"
                  : "hover:border-[#111827] hover:shadow-sm"
              } ${isActive ? "border-[#111827] shadow-sm" : "border-slate-200"}`}
            >
              <input
                type="radio"
                name="provider"
                value={provider}
                checked={isActive}
                onChange={() => handleProviderChange(provider)}
                className="h-5 w-5 border-2 border-slate-300 text-[#111827] focus:ring-2 focus:ring-[#111827] focus:ring-offset-2"
              />
              <span className="flex-1">
                <span className="block text-lg font-black text-[#111827]">
                  {providerCopy[provider].name}
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  {providerCopy[provider].detail}
                </span>
              </span>
              {isActive && (
                <span className="rounded-md bg-[#111827] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                  Active
                </span>
              )}
            </label>
          );
        })}
      </fieldset>

      {isUpdating && (
        <div className="mt-4 text-sm font-medium text-[#111827]">Saving provider...</div>
      )}
    </div>
  );
}
