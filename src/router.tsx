import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import RootLayout from "./layouts/RootLayout";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import LandingPage from "./pages/LandingPage";

// Lazy load page components for code splitting
const MonitoringPage = lazy(() => import("./pages/MonitoringPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

// Loading indicator component
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#bfdbfe] border-t-[#2563eb]"></div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: "monitor",
        element: (
          <Suspense fallback={<PageLoader />}>
            <MonitoringPage />
          </Suspense>
        ),
      },
      {
        path: "settings",
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
