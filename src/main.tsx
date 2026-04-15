import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import "./registerSW";
import { router } from "./router";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <RouterProvider router={router} />
  </ConvexAuthProvider>,
);
