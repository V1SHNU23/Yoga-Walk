import { useState, useEffect } from "react";
import Card from "../components/Card.jsx";
import AppNav from "../components/AppNav.jsx";
import "../styles/profile.css";
import "../styles/history.css";

// Icons
import SettingsIcon from "../icons/settings.svg";
import BackIcon from "../icons/back.svg";

export default function ProfilePage({ onChangePage }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ walks: 0, minutes: 0, poses: 0 });
  
  // Walk Details State
  const [selectedWalk, setSelectedWalk] = useState(null);
  const [walkReflections, setWalkReflections] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
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

  // Fetch walk reflections when a walk is selected
  useEffect(() => {
    if (selectedWalk) {
      setLoadingDetails(true);
      fetch(`${apiBase}/api/walk/${selectedWalk.WalkID}/reflections`)
        .then(res => res.json())
        .then(data => {
          setWalkReflections(data);
          setLoadingDetails(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingDetails(false);
        });
    }
  }, [selectedWalk, apiBase]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDateFull = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // 2. LOGIC: Determine which items to display (Top 3)
  const displayedHistory = history.slice(0, 3);

  // --- DETAIL VIEW ---
  if (selectedWalk) {
    return (
      <div className="historyPage">
        <div className="historyHeader">
          <button className="historyBackBtn" onClick={() => setSelectedWalk(null)}>
            <img src={BackIcon} alt="Back" />
          </button>
          <h2 className="historyPageTitle">Walk Details</h2>
          <div style={{width: '32px'}}></div>
        </div>
        <div className="historyContent" style={{ paddingTop: '16px' }}>
             <div style={{ 
                background: 'linear-gradient(135deg, #61b329 0%, #4d9920 100%)', 
                borderRadius: '20px', 
                padding: '20px', 
                color: 'white',
                marginBottom: '20px',
                boxShadow: '0 8px 20px rgba(97, 179, 41, 0.25)'
            }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
                    {formatDateFull(selectedWalk.WalkDate)}
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '15px' }}>
                    {selectedWalk.DistanceKm} km
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Time</div>
                        <div style={{ fontWeight: '600' }}>{selectedWalk.DurationMinutes} min</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Calories</div>
                        <div style={{ fontWeight: '600' }}>{selectedWalk.CaloriesBurned}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Poses</div>
                        <div style={{ fontWeight: '600' }}>{selectedWalk.PosesCompleted}</div>
                    </div>
                </div>
            </div>

            <h3 style={{ color: '#0a6f00', fontSize: '18px', margin: '0 0 12px 4px' }}>Your Reflections</h3>
            
            {loadingDetails ? (
                <p className="statusText">Loading thoughts...</p>
            ) : walkReflections.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {walkReflections.map((item, idx) => (
                        <Card key={idx} style={{ padding: '16px', borderLeft: '4px solid #61b329' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '16px' }}>🤔</span>
                                <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: '#1f3d1f', lineHeight: '1.4' }}>
                                    {item.question}
                                </p>
                            </div>
                            <div style={{ paddingLeft: '28px' }}>
                                <p style={{ margin: 0, fontSize: '14px', color: '#526b57', lineHeight: '1.5', fontStyle: 'italic' }}>
                                    "{item.answer}"
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="emptyState" style={{ marginTop: '0', padding: '30px', background: 'white', borderRadius: '16px' }}>
                    <span style={{ fontSize: '30px', display: 'block', marginBottom: '10px' }}>🍃</span>
                    <p style={{ margin: 0, color: '#6a7a6e' }}>No reflections recorded for this walk.</p>
                </div>
            )}
            
            <div style={{height: "40px"}}></div>
        </div>
      </div>
    );
  }

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
                <div 
                  key={walk.WalkID} 
                  className="historyCardItem"
                  onClick={() => setSelectedWalk(walk)}
                  style={{ cursor: 'pointer' }}
                >
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