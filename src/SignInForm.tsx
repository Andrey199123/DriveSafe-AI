"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="site-panel w-full p-8 sm:p-10">
      <p className="site-eyebrow">Access</p>
      <h2 className="mt-4 text-3xl font-black tracking-normal text-[#111827]">
        Enter the monitor
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-500">
        Use an email and password for a persistent account, or open a guest session for quick testing.
      </p>

      <div className="mt-8 inline-flex rounded-full bg-[#eff6ff] p-1">
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            flow === "signIn"
              ? "bg-[#111827] text-white"
              : "text-slate-500 hover:text-[#111827]"
          }`}
          onClick={() => setFlow("signIn")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            flow === "signUp"
              ? "bg-[#111827] text-white"
              : "text-slate-500 hover:text-[#111827]"
          }`}
          onClick={() => setFlow("signUp")}
        >
          Create account
        </button>
      </div>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((error) => {
            let toastTitle = "";
            if (error.message.includes("Invalid password")) {
              toastTitle = "Invalid password. Please try again.";
            } else {
              toastTitle =
                flow === "signIn"
                  ? "Could not sign in, did you mean to create an account?"
                  : "Could not create an account, did you mean to sign in?";
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting
            ? flow === "signIn"
              ? "Signing in"
              : "Creating account"
            : flow === "signIn"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <div className="my-6 flex items-center justify-center gap-4">
        <hr className="grow border-[#e2e8f0]" />
        <span className="text-sm text-slate-400">or</span>
        <hr className="grow border-[#e2e8f0]" />
      </div>

      <button
        className="site-secondary-button w-full"
        onClick={() => void signIn("anonymous")}
      >
        Continue anonymously
      </button>

      <p className="mt-4 text-sm leading-6 text-slate-500">
        Anonymous access is available for monitoring. The shared usage dashboard stays inside settings behind its own password.
      </p>
    </div>
  );
}
