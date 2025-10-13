import React from "react";
import ReactDOM from "react-dom/client";
import { NextUIProvider } from "@nextui-org/react";
import { Buffer } from "buffer";

import App from "./ui/App.web";
import { loadConfig } from "./config.web";
import { refreshDarkMode } from "./ui/theming";

import "./ui/styles.css";

// Make Buffer available globally for node-wav
window.Buffer = Buffer;

// Load configuration and start the app
console.log("Starting web app...");

loadConfig()
  .then(() => {
    console.log("Config loaded successfully");
    refreshDarkMode();

    const rootElement = document.getElementById("root");
    console.log("Root element:", rootElement);

    if (rootElement) {
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <NextUIProvider>
            <App />
          </NextUIProvider>
        </React.StrictMode>
      );
      console.log("App rendered successfully");
    } else {
      console.error("Root element not found!");
    }
  })
  .catch((error) => {
    console.error("Failed to load configuration:", error);

    // Start app anyway with default config
    const rootElement = document.getElementById("root");
    if (rootElement) {
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <NextUIProvider>
            <App />
          </NextUIProvider>
        </React.StrictMode>
      );
      console.log("App rendered with default config");
    }
  });
