import { useState, useEffect } from "react";
import Card from "../components/Card.jsx";
import AppNav from "../components/AppNav.jsx";
import "../styles/profile.css";

// Icons
import SettingsIcon from "../icons/settings.svg";

export default function ProfilePage({ onChangePage }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ walks: 0, minutes: 0, poses: 0 });
  
  const apiBase = "http://localhost:5000";

  // 1. FETCH DATA (Kept your original logic)
  useEffect(() => {
    fetch(`${apiBase}/api/walk_history`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        const historyData = data.history || [];
        setHistory(historyData);
        
        const totalDist = historyData.reduce((acc, curr) => acc + (curr.DistanceKm || 0), 0);
        const totalPoses = historyData.reduce((acc, curr) => acc + (curr.PosesCompleted || 0), 0);
        
        setStats({
          walks: historyData.length,
          km: totalDist.toFixed(1),
          poses: totalPoses
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // 2. LOGIC: Determine which items to display (Top 3)
  const displayedHistory = history.slice(0, 3);

  return (
    <div className="profilePage">
      <div className="profileBackground"></div>

      {/* 3. HEADER (Fixed at Top) */}
      <header className="profileHeader">
        <button 
          className="profileSettingsBtn"
          onClick={() => onChangePage("settings")} 
        >
           <img src={SettingsIcon} alt="Settings" />
        </button>

        <div className="profileAvatar">
          <span className="profileAvatarInitial">V</span>
        </div>
        <h2 className="profileName">Vishnu</h2>
        <p className="profileLevel">Yoga Walker • Lvl 3</p>
      </header>

      {/* 4. MAIN CONTENT (Scrollable Area) */}
      <main className="profileMain">
        
        {/* STATS ROW */}
        <div className="profileStatsRow">
          <div className="profileStatItem">
            <span className="profileStatValue">{stats.km}</span>
            <span className="profileStatLabel">Total km</span>
          </div>
          <div className="profileStatItem">
            <span className="profileStatValue">{stats.walks}</span>
            <span className="profileStatLabel">Walks</span>
          </div>
          <div className="profileStatItem">
            <span className="profileStatValue">{stats.poses}</span>
            <span className="profileStatLabel">Poses</span>
          </div>
        </div>

        {/* GOALS SECTION */}
        <section className="profileSection">
          <div className="profileSectionHeader">
            <h3 className="profileSectionTitle">Weekly Goals</h3>
          </div>
          <div className="profileCard">
            <div className="profileGoalRow">
              <div className="profileGoalInfo">
                <span className="profileGoalTitle">Walk 15km</span>
                <span className="profileGoalProgress">12.5 / 15 km</span>
              </div>
              <div className="profileProgressTrack">
                <div className="profileProgressFill" style={{ width: "80%" }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* HISTORY SECTION */}
        <section className="profileSection">
          <div className="profileSectionHeader">
            <h3 className="profileSectionTitle">Recent History</h3>
            
            {/* Toggle Button */}
            {history.length > 3 && (
              <span 
                className="profileSectionMeta" 
                onClick={() => onChangePage("history")} 
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                See All
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {loading ? (
              <p className="profileSectionText">Loading history...</p>
            ) : history.length === 0 ? (
               <p className="profileSectionText">No walks yet.</p>
            ) : (
              // Map over the filtered 'displayedHistory' list
              displayedHistory.map((walk) => (
                <div key={walk.WalkID} className="historyCardItem">
                  <div className="historyLeft">
                    <div className="historyIconBadge">🧘</div>
                    <div>
                      <div className="historyTitle">{formatDate(walk.WalkDate)}</div>
                      <div className="historySubtitle">Yoga Walk</div>
                    </div>
                  </div>
                  <div className="historyRight">
                    <div className="historyValue">{walk.DistanceKm.toFixed(2)} km</div>
                    <div className="historySubValue">{walk.DurationMinutes} min</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ACTIONS */}
        <div className="profileActions">
          <button className="profilePrimaryButton">View Achievements</button>
          <button className="profileSecondaryButton">Edit Profile</button>
        </div>
        
      </main>
    </div>
  );
}