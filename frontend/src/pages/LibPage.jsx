import { useState, useEffect } from "react";
import Card from "../components/Card.jsx";
import AnimatedList from "../components/AnimatedList.jsx";
import SearchIcon from "../icons/search.svg";
import StarIcon from "../icons/star.svg";
import StarIconFill from "../icons/star-fill.svg";
import BackIcon from "../icons/back.svg"; 

function LibrarySearch({ value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`libSearchPill ${open ? "libSearchPillOpen" : ""}`}>
      <button
        type="button"
        className="libSearchIconWrap"
        onClick={() => setOpen((prev) => !prev)}
      >
        <img src={SearchIcon} alt="Search" className="libSearchIconImg" />
      </button>

      <div className="libSearchInputWrap">
        <input
          className="libSearchInput"
          type="text"
          placeholder="Search poses..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
        />
      </div>
    </div>
  );
}

export default function LibPage() {
  const [activeTab, setActiveTab] = useState("poses");
  const [query, setQuery] = useState("");
  const [poses, setPoses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- NEW: State to track which pose is clicked ---
  const [selectedPose, setSelectedPose] = useState(null);

  // --- FETCH DATA ---
  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/poses')
      .then(res => res.json())
      .then(data => {
        const dbPoses = data.map(pose => ({
          id: pose.id,
          name: pose.name,
          duration: "30 sec",
          image: pose.animation_url, 
          favorite: false,
          // --- IMPORTANT: Capture the extra details here ---
          instructions: pose.instructions,
          benefits: pose.benefits
        }));
        setPoses(dbPoses);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching poses:", err);
        setLoading(false);
      });
  }, []);

  function toggleFavorite(id) {
    setPoses((prev) =>
      prev.map((pose) =>
        pose.id === id ? { ...pose, favorite: !pose.favorite } : pose
      )
    );
  }

  const visiblePoses = poses.filter((pose) => {
    if (activeTab === "favorites" && !pose.favorite) return false;
    return pose.name.toLowerCase().includes(query.toLowerCase());
  });

  // --- VIEW 1: THE DETAIL VIEW (Shows when a pose is selected) ---
  if (selectedPose) {
    return (
      <div className="libPage">
        {/* Reuse the background */}
        <div className="libPageInner">
          
          {/* Header with Back Button */}
          <div className="libHeader" style={{ justifyContent: 'flex-start', gap: '15px' }}>
            <button 
              onClick={() => setSelectedPose(null)} 
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              <img src={BackIcon} alt="Back" style={{ width: '24px', height: '24px' }} />
            </button>
            <h1 className="libTitle" style={{ fontSize: '24px' }}>{selectedPose.name}</h1>
          </div>

          {/* Scrollable Content */}
          <div className="libList" style={{ paddingBottom: '40px' }}>
            
            {/* 1. Animation/Image Section */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
               {selectedPose.image ? (
                  <img 
                    src={selectedPose.image} 
                    alt={selectedPose.name} 
                    style={{ maxWidth: '100%', borderRadius: '16px', maxHeight: '300px', objectFit: 'contain' }} 
                  />
               ) : (
                  <div style={{ fontSize: '80px' }}>🧘</div>
               )}
            </div>

            {/* 2. Benefits Card */}
            <Card style={{ marginBottom: '15px' }}>
              <h3 style={{ color: '#61b329', marginTop: 0, marginBottom: '8px' }}>Benefits</h3>
              <p style={{ color: '#526b57', lineHeight: '1.5' }}>
                {selectedPose.benefits || "Builds strength and flexibility."}
              </p>
            </Card>

            {/* 3. Instructions Card */}
            <Card>
              <h3 style={{ color: '#61b329', marginTop: 0, marginBottom: '8px' }}>How to do it</h3>
              <p style={{ color: '#526b57', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                {selectedPose.instructions || "Stand tall and breathe deeply..."}
              </p>
            </Card>

          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: THE LIST VIEW (Shows by default) ---
  return (
    <div className="libPage">
      <div className="libPageInner">
        
        {/* header */}
        <div className="libHeader">
          <h1 className="libTitle">Pose Library</h1>
          <LibrarySearch value={query} onChange={setQuery} />
        </div>

        {/* tabs */}
        <div className="libTabs">
          <button
            type="button"
            className={`libTab ${activeTab === "poses" ? "libTabActive" : ""}`}
            onClick={() => setActiveTab("poses")}
          >
            Poses
          </button>
          <button
            type="button"
            className={`libTab ${activeTab === "routines" ? "libTabActive" : ""}`}
            onClick={() => setActiveTab("routines")}
          >
            Routines
          </button>
          <button
            type="button"
            className={`libTab ${activeTab === "favorites" ? "libTabActive" : ""}`}
            onClick={() => setActiveTab("favorites")}
          >
            Favorites
          </button>
        </div>

        {/* list content */}
        <div className="libList">
          {(activeTab === "poses" || activeTab === "favorites") && (
            <>
              {loading ? (
                 <p className="libEmptyState" style={{color: '#61b329'}}>Loading library...</p>
              ) : visiblePoses.length > 0 ? (
                <AnimatedList
                  items={visiblePoses}
                  showGradients={true}
                  displayScrollbar={true}
                  enableArrowNavigation={false}
                  renderItem={(pose) => (
                    <div onClick={() => setSelectedPose(pose)} style={{ cursor: 'pointer' }}>
                      <Card className="libPoseCard">
                        <div className="libPoseRow">
                          <div className="libPoseThumb">
                            {pose.image ? (
                              <img src={pose.image} alt={pose.name} />
                            ) : (
                              <span className="libPoseThumbEmoji">🧘</span>
                            )}
                          </div>

                          <div className="libPoseText">
                            <div className="libPoseName">{pose.name}</div>
                            <div className="libPoseMeta">{pose.duration}</div>
                          </div>

                          <button
                            type="button"
                            className="libPoseFavoriteBtn"
                            onClick={(e) => {
                                e.stopPropagation(); // Don't open detail view when clicking star
                                toggleFavorite(pose.id);
                            }}
                          >
                            <img
                              src={pose.favorite ? StarIconFill : StarIcon}
                              alt={pose.favorite ? "Remove favorite" : "Add favorite"}
                            />
                          </button>

                          <div className="libPoseChevron">›</div>
                        </div>
                      </Card>
                    </div>
                  )}
                />
              ) : (
                <p className="libEmptyState">
                  {activeTab === "favorites"
                    ? "You have not added any favorites yet."
                    : "No poses match that search."}
                </p>
              )}
            </>
          )}

          {activeTab === "routines" && (
            <p className="libEmptyState">Routines will appear here later.</p>
          )}
        </div>
      </div>
    </div>
  );
}