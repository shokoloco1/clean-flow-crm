import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Initialize i18n (must be imported before App)
import "./i18n";

// Initialize error tracking
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
