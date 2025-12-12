import React from "react";
import ReactDOM from "react-dom/client";
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
    <App />
  </React.StrictMode>
);

// keep the service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}
