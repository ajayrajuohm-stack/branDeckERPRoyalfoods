import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global API Interceptor for Miles Web / Render split hosting
const API_URL = import.meta.env.VITE_API_URL || "";
const originalFetch = window.fetch;
window.fetch = (input, init) => {
    let url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (url.startsWith("/api")) {
        url = API_URL ? API_URL.replace(/\/$/, "") + url : url;
        init = init || {};
        init.credentials = "include"; // Ensure cookies are sent to Render
        return originalFetch(url, init);
    }
    return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
