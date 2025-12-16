import { useState, useEffect } from "react";
import Card from "../components/Card.jsx";
import "../styles/history.css"; 
import "../styles/profile.css"; 
import BackIcon from "../icons/back.svg";
import SearchIcon from "../icons/search.svg";
import TickIcon from "../icons/tick.svg"; // Added for benefits/reflections

export default function HistoryPage({ onBack }) {
  // --- EXISTING STATE ---
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // --- NEW STATE FOR DETAILS ---
  const [selectedWalk, setSelectedWalk] = useState(null);
  const [walkReflections, setWalkReflections] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const apiBase = "http://localhost:5000";

  // 1. Fetch History List (Existing)
  useEffect(() => {
    fetch(`${apiBase}/api/walk_history`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.history || [];
        setHistory(list);
        setFilteredHistory(list); 
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // 2. Filter Logic (Existing)
  useEffect(() => {
    let result = history;

    if (selectedDate) {
      result = result.filter(walk => 
        walk.WalkDate.startsWith(selectedDate)
      );
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(walk => {
        const dateStr = new Date(walk.WalkDate).toDateString().toLowerCase();
        const distStr = `${walk.DistanceKm} km`;
        const durStr = `${walk.DurationMinutes} min`;
        
        return dateStr.includes(lowerQuery) || 
               distStr.includes(lowerQuery) || 
               durStr.includes(lowerQuery);
      });
    }

    setFilteredHistory(result);
  }, [searchQuery, selectedDate, history]);

  // 3. NEW: Fetch Reflections when a walk is clicked
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
  }, [selectedWalk]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // --- VIEW 1: DETAIL VIEW (New) ---
  if (selectedWalk) {
    return (
      <div className="historyPage">
        {/* Detail Header */}
        <div className="historyHeader">
          <button className="historyBackBtn" onClick={() => setSelectedWalk(null)}>
            <img src={BackIcon} alt="Back" />
          </button>
          <h2 className="historyPageTitle">Walk Details</h2>
          <div style={{width: '32px'}}></div>
        </div>

        <div className="historyContent" style={{ paddingTop: '16px' }}>
             {/* Big Green Summary Card */}
             <div style={{ 
                background: 'linear-gradient(135deg, #61b329 0%, #4d9920 100%)', 
                borderRadius: '20px', 
                padding: '20px', 
                color: 'white',
                marginBottom: '20px',
                boxShadow: '0 8px 20px rgba(97, 179, 41, 0.25)'
            }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
                    {formatDate(selectedWalk.WalkDate)}
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

            {/* Reflections List */}
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

  // --- VIEW 2: LIST VIEW (Existing) ---
  return (
    <div className="historyPage">
      {/* HEADER */}
      <div className="historyHeader">
        <button className="historyBackBtn" onClick={onBack}>
          <img src={BackIcon} alt="Back" />
        </button>
        <h2 className="historyPageTitle">Walk History</h2>
        <div style={{width: '32px'}}></div> 
      </div>

      {/* FILTER BAR */}
      <div className="historyFilters">
        <div className="searchWrapper">
          <img src={SearchIcon} className="searchIcon" alt="Search" />
          <input 
            type="text" 
            placeholder="Search walks..." 
            className="historySearchInput"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <input 
          type="date" 
          className="historyDateInput"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {/* LIST CONTENT */}
      <div className="historyContent">
        {loading ? (
          <p className="statusText">Loading history...</p>
        ) : filteredHistory.length === 0 ? (
          <div className="emptyState">
            <p>No walks found matching your filters.</p>
            <button 
              className="clearFilterBtn"
              onClick={() => { setSearchQuery(""); setSelectedDate(""); }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          filteredHistory.map((walk) => (
            // ADD onClick HANDLER HERE
            <div key={walk.WalkID} onClick={() => setSelectedWalk(walk)} style={{ cursor: 'pointer' }}>
                <Card className="profileCard historyCardItem">
                  <div className="historyLeft">
                    <div className="historyIconBadge">🧘</div>
                    <div>
                      <div className="historyTitle">{formatDate(walk.WalkDate)}</div>
                      <div className="historySubtitle">
                        {walk.CaloriesBurned} kcal • {walk.PosesCompleted} poses
                      </div>
                    </div>
                  </div>
                  <div className="historyRight">
                    <div className="historyValue">{walk.DistanceKm.toFixed(2)} km</div>
                    <div className="historySubValue">{walk.DurationMinutes} min</div>
                  </div>
                  {/* Chevron to indicate clickability */}
                  <div style={{ marginLeft: '10px', color: '#ccc', fontSize: '18px' }}>›</div>
                </Card>
            </div>
          ))
        )}
        <div style={{height: "40px"}}></div>
      </div>
    </div>
  );
}