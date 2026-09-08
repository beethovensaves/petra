import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

import { router } from "./router.js";
import "./design-system/tokens.css";
import "./styles.css";
import "./product/reference-workbench.css";
import "./product/review-graph.css";
import "./product/work-petra.css";

const root = document.getElementById("root");
if (root === null) throw new Error("Petra's root element is missing.");

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
