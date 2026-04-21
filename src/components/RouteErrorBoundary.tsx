import { useRouteError, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    // Log error for debugging
    console.error("Route error:", error);
  }, [error]);

  const handleRetry = () => {
    // Reload the current page
    window.location.reload();
  };

  const handleGoHome = () => {
    // Navigate to landing page
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-md rounded-lg border border-[#e2e8f0] bg-white p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-50 p-3">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        
        <h1 className="mb-2 text-2xl font-bold text-[#111827]">
          Failed to load page
        </h1>
        
        <p className="mb-6 text-sm text-slate-600">
          Something went wrong while loading this page. Please try again or return to the home page.
        </p>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleRetry}
            className="rounded-lg bg-[#2563eb] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
          >
            Retry
          </button>
          
          <button
            onClick={handleGoHome}
            className="rounded-lg border border-[#e2e8f0] bg-white px-6 py-2.5 text-sm font-medium text-[#111827] transition-colors hover:bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
