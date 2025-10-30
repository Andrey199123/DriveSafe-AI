import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { DrunkDetector } from "./DrunkDetector";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="sticky top-0 z-10 bg-white h-20 sm:h-24 flex justify-between items-center border-b border-slate-200 shadow-sm px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/logo.png" alt="DriveSafe AI" className="w-16 h-16 sm:w-20 sm:h-20" />
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-600">DriveSafe AI</h2>
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
      <div className="text-center px-2">
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-800 mb-2 sm:mb-4">
          DriveSafe AI
        </h1>
        <Authenticated>
          <p className="text-base sm:text-xl text-slate-600 mb-2">
            Welcome back, {loggedInUser?.email ?? "friend"}!
          </p>
          <p className="text-slate-500 text-sm sm:text-base">
            Hands-free driver alert system to keep roads safe
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-base sm:text-xl text-slate-600 mb-2">
            Advanced AI Detection System
          </p>
          <p className="text-slate-500 mb-6 text-sm sm:text-base">
            Sign in to use our hands-free driver alert technology
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
