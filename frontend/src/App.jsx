import { useState } from "react";
import AppNav from "./components/AppNav.jsx";

import HomePage from "./pages/HomePage.jsx";
import MapPage from "./pages/MapPage.jsx";
import LibPage from "./pages/LibPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

function App() {
  const [activePage, setActivePage] = useState("home");

  const screenClassName =
    activePage === "home"
      ? "appScreen homePage"
      : activePage === "maps"
      ? "appScreen mapPage"
      : "appScreen";

  function renderPage() {
    switch (activePage) {
      case "maps":
        return <MapPage />;
      case "library":
        return <LibPage />;
      case "settings":
        return <SettingsPage onChangePage={setActivePage} />;
      case "profile":
        // pass navigation handler into profile
        return <ProfilePage onChangePage={setActivePage} />;
      case "home":
      default:
        return <HomePage />;
    }
  }

  return (
    <div className="app-shell">
      <div className="app-inner">
        <div className="appRoot">
          <div className={screenClassName}>
            <div className="mainPage">{renderPage()}</div>

            <AppNav
              activePage={activePage}
              onChangePage={setActivePage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
