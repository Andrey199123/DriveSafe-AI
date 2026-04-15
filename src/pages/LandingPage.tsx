import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignInForm } from "../SignInForm";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d9d3c7] border-t-[#1a7457]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="text-center">
        <span className="site-badge">Built for practical, low-distraction driver checks</span>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-black tracking-[-0.06em] text-[#111827] sm:text-7xl">
          A calmer interface for driver attention and motion awareness.
        </h1>
        <Authenticated>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-500 sm:text-xl">
            Welcome back{loggedInUser?.email ? `, ${loggedInUser.email}` : ""}. Review live camera input, check motion context, and keep shared usage metrics behind settings.
          </p>
          <div className="mt-8">
            <Link to="/monitor" className="site-primary-button">
              Go to Monitoring
            </Link>
          </div>
        </Authenticated>
        <Unauthenticated>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-500 sm:text-xl">
            Sign in with email or continue anonymously to test the monitor. Shared API usage remains protected by a separate password in settings.
          </p>
        </Unauthenticated>
      </section>

      <Unauthenticated>
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="site-panel p-8 sm:p-10">
              <p className="site-eyebrow">The workspace</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#111827] sm:text-4xl">
                Live camera review, speed context, and a cleaner alert surface.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
                The interface now borrows the same editorial feel as the reference site: warm off-white surfaces, darker type, restrained green accents, rounded pill controls, and wide breathing room.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="site-stat-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Camera</p>
                  <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#111827]">Live</p>
                  <p className="mt-2 text-sm text-slate-500">Continuous monitoring with manual review controls.</p>
                </div>
                <div className="site-stat-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Motion</p>
                  <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#111827]">Smoothed</p>
                  <p className="mt-2 text-sm text-slate-500">GPS drift filtering and more conservative overspeed alerts.</p>
                </div>
                <div className="site-stat-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Access</p>
                  <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#111827]">Flexible</p>
                  <p className="mt-2 text-sm text-slate-500">Anonymous sessions stay available, with settings-gated usage data.</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <SignInForm />
          </div>
        </section>
      </Unauthenticated>
    </div>
  );
}
