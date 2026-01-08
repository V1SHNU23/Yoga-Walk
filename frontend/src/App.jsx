import { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { DataProvider } from "./contexts/DataContext"; // <--- IMPORTANT IMPORT

import AppNav from "./components/AppNav.jsx";
import HomePage from "./pages/HomePage.jsx";
import MapPage from "./pages/MapPage.jsx";
import LibPage from "./pages/LibPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import HistoryPage from "./pages/HistoryPage";

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Determine "activePage" string based on current URL path
  const getActivePage = (path) => {
    if (path === "/map") return "maps";
    if (path === "/library") return "library";
    if (path === "/profile") return "profile";
    if (path === "/settings") return "settings";
    if (path === "/history") return "history";
    return "home";
  };

  const activePage = getActivePage(location.pathname);

  // 2. Handle Navigation requests from the AppNav bar
  function handleNavChange(pageId) {
    switch (pageId) {
      case "maps": navigate("/map"); break;
      case "library": navigate("/library"); break;
      case "profile": navigate("/profile"); break;
      case "settings": navigate("/settings"); break;
      case "history": navigate("/history"); break;
      case "home": 
      default: navigate("/"); break;
    }
  }

  // 3. Dynamic class for styling based on route
  const screenClassName =
    activePage === "home"
      ? "appScreen homePage"
      : activePage === "maps"
      ? "appScreen mapPage"
      : "appScreen";

  return (
    /* --- THIS IS THE FIX: WRAP EVERYTHING IN DATA PROVIDER --- */
    <DataProvider>
      <div className="app-shell">
        <div className="app-inner">
          <div className="appRoot">
            <div className={screenClassName}>
              
              <div className="mainPage">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/library" element={<LibPage />} />
                  
                  <Route 
                    path="/settings" 
                    element={<SettingsPage onChangePage={handleNavChange} />} 
                  />
                  <Route 
                    path="/profile" 
                    element={<ProfilePage onChangePage={handleNavChange} />} 
                  />
                  <Route 
                    path="/history" 
                    element={<HistoryPage onBack={() => handleNavChange("profile")} />} 
                  />
                </Routes>
              </div>

              <AppNav
                activePage={activePage}
                onChangePage={handleNavChange}
              />
            </div>
          </div>
        </div>
      </div>
    </DataProvider>
  );
}

export default App;