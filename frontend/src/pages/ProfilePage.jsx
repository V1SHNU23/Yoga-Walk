import { useState, useEffect } from "react";
import Card from "../components/Card.jsx";
import SettingsIcon from "../icons/settings.svg";
import SettingsIconFill from "../icons/settings-fill.svg";

export default function ProfilePage({ onChangePage }) {
  // 1. State for User Stats (Default to 0)
  const [stats, setStats] = useState({
    walks: 0,
    minutes: 0,
    poses: 0,
    weeklyProgress: 0, 
    streak: 1, // Default streak for now
  });

  // 2. State for the History List
  const [history, setHistory] = useState([]);

  // 3. Load Data from LocalStorage on Startup
  useEffect(() => {
    const savedData = JSON.parse(localStorage.getItem("userWalkHistory") || "[]");
    setHistory(savedData);

    // Calculate Totals
    const totals = savedData.reduce(
      (acc, walk) => ({
        walks: acc.walks + 1,
        minutes: acc.minutes + (walk.duration || 0),
        poses: acc.poses + (walk.poses || 0),
      }),
      { walks: 0, minutes: 0, poses: 0 }
    );

    // Calculate Weekly Progress (Example: Goal is 5 walks a week)
    const weeklyGoal = 5;
    const progress = Math.min(totals.walks / weeklyGoal, 1.0);

    setStats({
      ...totals,
      streak: 3, // Hardcoded streak for now (requires complex date logic)
      weeklyProgress: progress,
    });
  }, []);

  // Utility to clear data (for testing)
  const handleClearData = () => {
    if (confirm("Reset all walk history?")) {
      localStorage.removeItem("userWalkHistory");
      setStats({ walks: 0, minutes: 0, poses: 0, weeklyProgress: 0, streak: 1 });
      setHistory([]);
    }
  };

  return (
    <div className="profilePage">
      {/* gradient background handled purely in CSS */}
      <div className="profileBackground" />

      {/* content */}
      <div className="profileInner">
        {/* header */}
        <header className="profileHeader">
          {/* settings button */}
          <button
            type="button"
            className="profileSettingsBtn"
            onClick={() => onChangePage && onChangePage("settings")}
          >
            <img
              src={SettingsIcon}
              className="profileSettingsIcon outline"
              alt="Open settings"
            />
            <img
              src={SettingsIconFill}
              className="profileSettingsIcon filled"
              alt=""
              aria-hidden="true"
            />
          </button>

          <div className="profileAvatar">
            <span className="profileAvatarInitial">V</span>
          </div>

          <h1 className="profileName">Vishnu</h1>
          <p className="profileStreak">{stats.streak} day streak</p>
        </header>

        {/* stats row (NOW DYNAMIC) */}
        <section className="profileStatsRow">
          <Card className="profileStatCard">
            <div className="profileStatLabel">Walks</div>
            <div className="profileStatValue">{stats.walks}</div>
          </Card>

          <Card className="profileStatCard">
            <div className="profileStatLabel">Minutes</div>
            <div className="profileStatValue">{stats.minutes}</div>
          </Card>

          <Card className="profileStatCard">
            <div className="profileStatLabel">Poses</div>
            <div className="profileStatValue">{stats.poses}</div>
          </Card>
        </section>

        {/* weekly progress (NOW DYNAMIC) */}
        <section className="profileSection">
          <Card className="profileCard">
            <div className="profileSectionHeader">
              <h2 className="profileSectionTitle">This week</h2>
              <span className="profileSectionMeta">
                {Math.round(stats.weeklyProgress * 100)}%
              </span>
            </div>

            <div className="profileProgressTrack">
              <div
                className="profileProgressFill"
                style={{ width: `${stats.weeklyProgress * 100}%` }}
              />
            </div>

            <p className="profileSectionText">
              {stats.walks} walks completed this week
            </p>
          </Card>
        </section>

        {/* level card (Kept as prototype for now) */}
        <section className="profileSection">
          <Card className="profileCard">
            <div className="profileSectionHeader">
              <h2 className="profileSectionTitle">Current level</h2>
              <span className="profileSectionMeta">Tranquil Seeker</span>
            </div>

            <div className="profileProgressTrack">
              <div
                className="profileProgressFill profileProgressFillSoft"
                style={{ width: "45%" }}
              />
            </div>

            <p className="profileSectionText">
              Keep walking to unlock the next level.
            </p>
          </Card>
        </section>

        {/* NEW: Recent History Section */}
        <section className="profileSection">
          <div className="profileSectionHeader" style={{marginBottom: '10px'}}>
             <h2 className="profileSectionTitle" style={{color: '#1f3d1f', fontSize:'18px'}}>Recent History</h2>
             {history.length > 0 && (
               <button onClick={handleClearData} style={{border:'none', background:'transparent', color:'#e74c3c', fontSize:'12px', fontWeight:'600'}}>Reset</button>
             )}
          </div>
          
          {history.length === 0 ? (
            <div style={{textAlign:'center', padding:'20px', color:'#88a888', background:'rgba(255,255,255,0.6)', borderRadius:'16px'}}>
              No walks yet. Go start one! 🍂
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {history.map((walk) => (
                <Card key={walk.id} className="profileCard" style={{padding:'12px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                    <div style={{fontSize:'20px', background:'#f4f8f1', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'10px'}}>🧘</div>
                    <div>
                      <div style={{fontSize:'14px', fontWeight:'700', color:'#1f3d1f'}}>{walk.date}</div>
                      <div style={{fontSize:'12px', color:'#88a888'}}>{walk.time}</div>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'14px', fontWeight:'700', color:'#1f3d1f'}}>{walk.distance} km</div>
                    <div style={{fontSize:'11px', color:'#61b329'}}>{walk.duration} min</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* actions */}
        <section className="profileActions">
          <button
            type="button"
            className="profilePrimaryButton"
          >
            Edit profile
          </button>
          <button
            type="button"
            className="profileSecondaryButton"
          >
            View achievements
          </button>
        </section>
      </div>
    </div>
  );
}