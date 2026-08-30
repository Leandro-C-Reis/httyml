import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyStoredTheme } from "./lib/theme";

// Applied before the first render, not inside App's own effects, so the
// very first paint already has the persisted theme instead of flashing the
// default palette and then swapping.
applyStoredTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
