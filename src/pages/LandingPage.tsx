import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignInForm } from "../SignInForm";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#bfdbfe] border-t-[#2563eb]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <span className="site-badge">Driver awareness, without dashboard noise</span>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-normal text-[#111827] sm:text-7xl">
            DriveSafe AI keeps the cabin check clear.
          </h1>
        </div>
        <Authenticated>
          <div className="max-w-xl lg:justify-self-end">
            <p className="text-lg leading-8 text-slate-600 sm:text-xl">
              Welcome back{loggedInUser?.email ? `, ${loggedInUser.email}` : ""}. Open the live monitor, review motion context, and keep shared API controls behind settings.
            </p>
            <div className="mt-8">
            <Link to="/monitor" className="site-primary-button">
              Go to Monitoring
            </Link>
            </div>
          </div>
        </Authenticated>
        <Unauthenticated>
          <p className="max-w-xl text-lg leading-8 text-slate-600 sm:text-xl lg:justify-self-end">
            Sign in with email or continue anonymously to run a live cabin check. API usage and provider controls stay behind the settings password.
          </p>
        </Unauthenticated>
      </section>

      <Unauthenticated>
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="site-panel p-6 sm:p-8">
            <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
              <div>
                <p className="site-eyebrow">Cabin readiness</p>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-normal text-[#111827] sm:text-4xl">
                  Camera, road speed, and alert state in one scan.
                </h2>
              </div>
              <p className="text-base leading-7 text-slate-600">
                DriveSafe keeps the operating surface spare: start the camera, watch the current state, and let the app call attention only when the signal changes.
              </p>
            </div>

            <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[#dbeafe] bg-[#dbeafe] sm:grid-cols-3">
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Camera</p>
                <p className="mt-3 text-2xl font-black tracking-normal text-[#111827]">Live</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Manual start keeps review under driver control.</p>
              </div>
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Motion</p>
                <p className="mt-3 text-2xl font-black tracking-normal text-[#111827]">Smoothed</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">GPS drift filtering reduces noisy overspeed calls.</p>
              </div>
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Access</p>
                <p className="mt-3 text-2xl font-black tracking-normal text-[#111827]">Flexible</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Anonymous sessions stay separate from protected usage controls.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 border-t border-[#e2e8f0] pt-6 sm:grid-cols-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">01. Capture</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Use live camera or upload a reference frame.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827]">02. Assess</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Route analysis through the selected vision provider.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827]">03. Alert</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Escalate only when safety signals persist.</p>
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
