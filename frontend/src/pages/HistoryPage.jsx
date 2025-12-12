import { useState, useEffect } from "react";
import Card from "../components/Card.jsx";
import "../styles/history.css"; 
import "../styles/profile.css"; 
import BackIcon from "../icons/back.svg";
import SearchIcon from "../icons/search.svg";

export default function HistoryPage({ onBack }) {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const apiBase = "http://localhost:5000";

  // 1. Fetch Data
  useEffect(() => {
    fetch(`${apiBase}/api/walk_history`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.history || [];
        setHistory(list);
        setFilteredHistory(list); // Show all initially
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // 2. Filter Logic (Runs whenever search or date changes)
  useEffect(() => {
    let result = history;

    // Filter by Date (Calendar)
    if (selectedDate) {
      result = result.filter(walk => 
        walk.WalkDate.startsWith(selectedDate)
      );
    }

    // Filter by Search Text (Matches Distance, Duration, or Month)
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

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="historyPage">
      {/* HEADER */}
      <div className="historyHeader">
        <button className="historyBackBtn" onClick={onBack}>
          <img src={BackIcon} alt="Back" />
        </button>
        <h2 className="historyPageTitle">Walk History</h2>
        <div style={{width: '32px'}}></div> {/* Spacer for alignment */}
      </div>

      {/* FILTER BAR */}
      <div className="historyFilters">
        {/* Search Input */}
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

        {/* Calendar Input */}
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
            <Card key={walk.WalkID} className="profileCard historyCardItem">
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
            </Card>
          ))
        )}
        <div style={{height: "40px"}}></div>
      </div>
    </div>
  );
}