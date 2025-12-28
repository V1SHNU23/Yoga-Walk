import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css"; 
import "./styles/nav.css";
import "./styles/home.css";
import "./styles/map.css";
import "./styles/library.css";
import "./styles/profile.css";
import "./styles/settings.css"; 
import "leaflet/dist/leaflet.css";   

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// --- SERVICE WORKER REGISTRATION ---
// We only register the service worker in PRODUCTION.
// This prevents the "Zombie App" issue where localhost serves old cached code.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
        
        // Check for updates every minute
        setInterval(() => {
          registration.update();
        }, 60000);
        
        // Handle updates when a new SW is found
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available
              if (confirm("New version available! Reload to update?")) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((err) => console.error("SW registration failed: ", err));
  });
  
  // Reload the page when the new service worker takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}