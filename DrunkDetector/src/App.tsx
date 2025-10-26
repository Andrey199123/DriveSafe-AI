import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { DrunkDetector } from "./DrunkDetector";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="sticky top-0 z-10 bg-white h-16 flex justify-between items-center border-b border-slate-200 shadow-sm px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">🚗</span>
          </div>
          <h2 className="text-xl font-bold text-blue-600">
            SafeDrive AI
          </h2>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-slate-800 mb-4">
          SafeDrive AI Detector
        </h1>
        <Authenticated>
          <p className="text-xl text-slate-600 mb-2">
            Welcome back, {loggedInUser?.email ?? "friend"}!
          </p>
          <p className="text-slate-500">
            AI-powered drunk driving detection to keep our roads safe
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-xl text-slate-600 mb-2">
            Advanced AI Detection System
          </p>
          <p className="text-slate-500 mb-6">
            Sign in to use our AI-powered drunk driving detection technology
          </p>
        </Unauthenticated>
      </div>

      <Authenticated>
        <DrunkDetector />
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
