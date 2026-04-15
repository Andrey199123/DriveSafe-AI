import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { SignOutButton } from "../SignOutButton";
import Navigation from "../components/Navigation";
import { useEffect, useRef } from "react";

/**
 * RootLayout component provides the main application structure with accessibility features.
 * 
 * Accessibility Features:
 * - Skip link: Allows keyboard and screen reader users to bypass navigation and jump to main content
 * - Focus management: Automatically moves focus to main content when navigating between pages
 * - Semantic HTML: Uses proper landmark elements (header, main, nav) for screen reader navigation
 * - Keyboard navigation: All interactive elements are keyboard accessible with visible focus indicators
 * 
 * The skip link is visually hidden (sr-only) but becomes visible when focused, meeting WCAG 2.1 
 * success criterion 2.4.1 (Bypass Blocks).
 * 
 * Focus management ensures that when users navigate between pages, their focus is moved to the 
 * main content area, providing a better experience for keyboard and screen reader users.
 */
export default function RootLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Move focus to main content when route changes
  // This helps keyboard and screen reader users by automatically focusing the new page content
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus();
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Skip links for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#1a7457] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-[#1a7457] focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-20 border-b border-[#e8e5de] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-24 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DriveSafe AI" className="h-14 w-14 sm:h-16 sm:w-16" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1a7457]">
                Driver awareness monitor
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#111827] sm:text-2xl">
                DriveSafe AI
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-[#e8e5de] bg-[#faf9f5] px-4 py-2 text-sm font-medium text-slate-500 md:inline-flex">
              Camera, speed, and shared usage controls
            </span>
            <Navigation className="hidden md:flex" />
            <SignOutButton />
          </div>
        </div>
        {/* Mobile navigation - full width below header */}
        <div className="border-t border-[#e8e5de] bg-white px-4 py-3 md:hidden">
          <Navigation className="flex justify-center" />
        </div>
      </header>
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 focus:outline-none"
      >
        <div className="w-full">
          <Outlet />
        </div>
      </main>
      <Toaster />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
