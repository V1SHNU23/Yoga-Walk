import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // --- ADD THIS IMPORT ---
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
    {/* Wrap App in BrowserRouter to enable routing hooks */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered:", registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
        
        // Handle updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New service worker available, prompt user to refresh
              if (confirm("New version available! Reload to update?")) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((err) => console.error("SW registration failed", err));
  });
  
  // Handle service worker updates
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}