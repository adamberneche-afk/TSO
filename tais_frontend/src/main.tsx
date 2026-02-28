import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { initializeMemoryFromBrowser } from "./services/memory/memoryInitializer";

initializeMemoryFromBrowser().then(result => {
  if (result.success && result.memoriesCreated > 0) {
    console.log(`[Memory] ${result.message}`);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
