import { useState, useEffect } from "react";
import Card from "../components/Card.jsx";
import "../styles/profile.css";

// Icons
import SettingsIcon from "../icons/settings.svg";

export default function ProfilePage({ onChangePage }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ walks: 0, minutes: 0, poses: 0 });
  
  // 🟢 1. NEW STATE: Controls whether we show 3 items or ALL items
  const [showAll, setShowAll] = useState(false);
  
  const apiBase = "http://localhost:5000";

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

  // 🟢 2. LOGIC: Determine which items to display
  // If showAll is true, show everything. If false, only show the first 3.
  const displayedHistory = history.slice(0, 3);

  return (
    <div className="profilePage">
      <div className="profileBackground"></div>

      <div className="profileInner">
        
        {/* HEADER */}
        <div className="profileHeader">
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
        </div>

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
        <div className="profileSection">
          <div className="profileSectionHeader">
            <h3 className="profileSectionTitle">Weekly Goals</h3>
          </div>
          <Card className="profileCard">
            <div className="profileGoalRow">
              <div className="profileGoalInfo">
                <span className="profileGoalTitle">Walk 15km</span>
                <span className="profileGoalProgress">12.5 / 15 km</span>
              </div>
              <div className="profileProgressTrack">
                <div className="profileProgressFill" style={{ width: "80%" }}></div>
              </div>
            </div>
          </Card>
        </div>

        {/* HISTORY SECTION */}
        <div className="profileSection">
          <div className="profileSectionHeader">
            <h3 className="profileSectionTitle">Recent History</h3>
            
            {/* 🟢 3. TOGGLE BUTTON: Only show if history has more than 3 items */}
            {history.length > 3 && (
              <span 
              className="profileSectionMeta" 
              onClick={() => onChangePage("history")} /* <-- Changed! */
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              See All
            </span>
            )}
          </div>

          <div className="profileHistoryList">
            {loading ? (
              <p className="profileSectionText">Loading history...</p>
            ) : history.length === 0 ? (
               <p className="profileSectionText">No walks yet.</p>
            ) : (
              // 🟢 4. RENDER: Map over the filtered 'displayedHistory' list
              displayedHistory.map((walk) => (
                <Card key={walk.WalkID} className="profileCard historyCardItem">
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
                </Card>
              ))
            )}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="profileActions">
          <button className="profilePrimaryButton">Edit Profile</button>
          <button className="profileSecondaryButton">Achievements</button>
        </div>
        
        <div style={{height: "80px"}}></div>
      </div>
    </div>
  );
}