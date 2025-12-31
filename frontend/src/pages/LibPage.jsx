import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { motion, useMotionValue, useTransform } from "framer-motion"; // Animation Lib
import Card from "../components/Card.jsx";
import AnimatedList from "../components/AnimatedList.jsx";
import SearchIcon from "../icons/search.svg";
import StarIcon from "../icons/star.svg";
import StarIconFill from "../icons/star-fill.svg";
import BackIcon from "../icons/back.svg"; 

// --- CONFIG ---
const API_BASE = "http://127.0.0.1:5000"; 
const DURATION_OPTIONS = ["30 sec", "45 sec", "1 min", "2 min", "5 min"];

// --- SUB-COMPONENT: SWIPEABLE CARD ---
function SwipeableRoutineCard({ routine, onClick, onDelete }) {
  const x = useMotionValue(0);
  // Fade the card slightly as you slide it to reveal the red layer
  const opacity = useTransform(x, [-100, 0], [1, 1]); 
  
  // Drag end handler: if dragged far enough, keep it open (optional logic)
  // For now, we rely on the user seeing the red button and clicking it.

  return (
    <div className="libSwipeContainer">
      {/* 1. BACKGROUND TRASH LAYER */}
      <div className="libSwipeTrashLayer">
        <button 
           className="libSwipeTrashBtn"
           onClick={(e) => {
             e.stopPropagation();
             onDelete(routine.id);
           }}
        >
           🗑️
        </button>
      </div>

      {/* 2. FOREGROUND CARD (Draggable) */}
      <motion.div
        style={{ x, opacity, position: 'relative', zIndex: 1, background: 'transparent' }}
        drag="x"
        dragConstraints={{ left: -100, right: 0 }} // Limit how far it slides
        dragElastic={0.1}
        onClick={() => onClick(routine)}
      >
        <Card className="libPoseCard" style={{ margin: 0, border: 'none' }}>
           <div className="libPoseRow">
              <div className="libPoseThumb" style={{ background: '#e9f7dd' }}>
                 {routine.coverImage ? (
                    <img 
                      src={routine.coverImage} 
                      alt="Cover" 
                      style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px'}} 
                    />
                 ) : (
                    <span className="libPoseThumbEmoji">📋</span>
                 )}
              </div>
              <div className="libPoseText">
                 <div className="libPoseName">{routine.title}</div>
                 <div className="libPoseMeta">{routine.poseCount} poses • {routine.duration}</div>
              </div>
              <div className="libPoseChevron">›</div>
           </div>
        </Card>
      </motion.div>
    </div>
  );
}

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
  const navigate = useNavigate(); 
  const [activeTab, setActiveTab] = useState("poses");
  const [query, setQuery] = useState("");
  
  // --- DATA STATE ---
  const [poses, setPoses] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState([]);
  
  // --- SELECTION STATE ---
  const [selectedPose, setSelectedPose] = useState(null);       
  const [selectedRoutine, setSelectedRoutine] = useState(null); 

  // --- BUILDER STATE ---
  const [isCreating, setIsCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPoses, setDraftPoses] = useState([]);
  const [draftCover, setDraftCover] = useState(null); 

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchData();
  }, []);

  function fetchData() {
    setLoading(true);

    // 1. Fetch Poses
    fetch(`${API_BASE}/api/poses`)
      .then(res => res.json())
      .then(data => {
        const dbPoses = data.map(pose => ({
          id: pose.id,
          name: pose.name,
          duration: "30 sec", // Default if not in DB
          image: pose.animation_url, 
          favorite: false,
          instructions: pose.instructions,
          benefits: pose.benefits
        }));
        setPoses(dbPoses);
      })
      .catch(err => console.error("Error fetching poses:", err));

    // 2. Fetch Routines
    fetch(`${API_BASE}/api/routines`)
      .then(res => res.json())
      .then(data => {
        setRoutines(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching routines:", err);
        setLoading(false);
      });
  }

  function toggleFavorite(id) {
    setPoses((prev) =>
      prev.map((pose) =>
        pose.id === id ? { ...pose, favorite: !pose.favorite } : pose
      )
    );
  }

  // --- BUILDER LOGIC ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDraftCover(reader.result);
    };
    reader.readAsDataURL(file);
  };

  function handleAddToDraft(pose) {
    setDraftPoses(prev => [...prev, { 
      ...pose, 
      uniqueId: Date.now(),
      duration: "30 sec" 
    }]);
  }

  function handleRemoveFromDraft(uniqueId) {
    setDraftPoses(prev => prev.filter(p => p.uniqueId !== uniqueId));
  }

  function handleCycleDuration(uniqueId) {
    setDraftPoses(prev => prev.map(p => {
      if (p.uniqueId === uniqueId) {
        const currentIndex = DURATION_OPTIONS.indexOf(p.duration);
        const nextIndex = (currentIndex + 1) % DURATION_OPTIONS.length;
        return { ...p, duration: DURATION_OPTIONS[nextIndex] };
      }
      return p;
    }));
  }

  // --- SAVE TO BACKEND ---
  function handleSaveRoutine() {
    if (!draftTitle.trim()) {
      alert("Please name your routine.");
      return;
    }
    if (draftPoses.length === 0) {
      alert("Please add at least one pose.");
      return;
    }

    // Calculate total duration roughly
    const totalMinutes = draftPoses.reduce((acc, p) => {
       if (p.duration.includes("min")) return acc + parseInt(p.duration);
       return acc + 0.5; // 30 sec is 0.5 min
    }, 0);
    const calculatedDuration = `${Math.ceil(totalMinutes)} min`;

    // Construct Payload
    const payload = {
        title: draftTitle,
        description: `Custom ${draftPoses.length}-pose sequence`,
        duration: calculatedDuration,
        coverImage: draftCover, // Sends Base64 string
        poses: draftPoses.map(p => ({
            id: p.id,
            name: p.name,
            duration: p.duration
        }))
    };

    // Send to API
    fetch(`${API_BASE}/api/routines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    .then(res => {
        if(res.ok) {
            // Refresh Data
            fetchData();
            // Reset UI
            setIsCreating(false);
            setDraftTitle("");
            setDraftPoses([]);
            setDraftCover(null);
            setActiveTab("routines");
        } else {
            alert("Failed to save routine.");
        }
    })
    .catch(err => alert("Error: " + err));
  }

  // --- DELETE ROUTINE ---
  function handleDeleteRoutine(id) {
    if(!confirm("Delete this routine permanently?")) return;

    // Optimistic UI update
    setRoutines(prev => prev.filter(r => r.id !== id));

    fetch(`${API_BASE}/api/routines/${id}`, {
        method: "DELETE"
    }).catch(err => {
        alert("Server error deleting routine");
        fetchData(); // Revert if failed
    });
  }

  function handleStartRoutineWalk() {
     if (!selectedRoutine) return;
     navigate('/map', { state: { routine: selectedRoutine } });
  }

  // --- FILTERING ---
  const visiblePoses = poses.filter((pose) => {
    if (activeTab === "favorites" && !pose.favorite) return false;
    return pose.name.toLowerCase().includes(query.toLowerCase());
  });

  // --- RENDER: SINGLE POSE VIEW ---
  if (selectedPose) {
    return (
      <div className="libPage">
        <div className="libPageInner">
          <div className="libHeader" style={{ justifyContent: 'flex-start', gap: '15px' }}>
            <button 
              onClick={() => setSelectedPose(null)} 
              className="libBackBtn"
            >
              <img src={BackIcon} alt="Back" className="libBackIcon" />
            </button>
            <h1 className="libTitle">{selectedPose.name}</h1>
          </div>
          <div className="libList">
            <div className="libPoseDetailImgWrapper">
               {selectedPose.image ? (
                  <img src={selectedPose.image} alt={selectedPose.name} className="libPoseDetailImg" />
               ) : (
                  <div className="libPoseDetailPlaceholder">🧘</div>
               )}
            </div>
            <Card style={{ marginBottom: '15px' }}>
              <h3 className="libCardTitle">Benefits</h3>
              <p className="libCardText">{selectedPose.benefits}</p>
            </Card>
            <Card>
              <h3 className="libCardTitle">How to do it</h3>
              <p className="libCardText">{selectedPose.instructions}</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN LIBRARY VIEW ---
  return (
    <div className="libPage">
      <div className="libPageInner">
        
        {/* HEADER AREA */}
        <div className="libHeader">
          {isCreating ? (
             // BUILDER HEADER
             <div className="libBuilderHeader">
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="libBtnText libBtnCancel"
                >
                   Cancel
                </button>
                <span className="libBuilderTitle">New Routine</span>
                <button 
                  onClick={handleSaveRoutine} 
                  className="libBtnText libBtnSave"
                >
                   Save
                </button>
             </div>
          ) : activeTab === "routines" && selectedRoutine ? (
             // ROUTINE DETAIL HEADER
             <div className="libHeaderRow">
                <button 
                  onClick={() => setSelectedRoutine(null)} 
                  className="libBackBtn"
                >
                   <img src={BackIcon} alt="Back" className="libBackIcon" />
                </button>
                <h1 className="libTitle">{selectedRoutine.title}</h1>
             </div>
          ) : (
             // STANDARD HEADER
             <>
               <h1 className="libTitle">Pose Library</h1>
               <LibrarySearch value={query} onChange={setQuery} />
             </>
          )}
        </div>

        {/* TABS (Hidden if creating or viewing routine details) */}
        {!isCreating && (!selectedRoutine) && (
          <div className="libTabs">
            <button className={`libTab ${activeTab === "poses" ? "libTabActive" : ""}`} onClick={() => setActiveTab("poses")}>Poses</button>
            <button className={`libTab ${activeTab === "routines" ? "libTabActive" : ""}`} onClick={() => setActiveTab("routines")}>Routines</button>
            <button className={`libTab ${activeTab === "favorites" ? "libTabActive" : ""}`} onClick={() => setActiveTab("favorites")}>Favorites</button>
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="libList">

          {/* --- 1. BUILDER UI --- */}
          {isCreating && (
            <>
              {/* DRAFT AREA (Sticky Top) */}
              <div className="libDraftBoard">
                 <input 
                    type="text" 
                    placeholder="Name your routine..." 
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="libDraftInput"
                 />

                 {/* UPDATED: COVER IMAGE UPLOADER */}
                 <div className="libCoverSection">
                    <span className="libCoverLabel">Cover Image</span>
                    <div className="libCoverUploadContainer">
                        <input 
                           type="file" 
                           id="coverUploadInput" 
                           accept="image/*" 
                           onChange={handleImageUpload}
                           style={{ display: 'none' }} 
                        />
                        
                        {!draftCover ? (
                           <label htmlFor="coverUploadInput" className="libCoverUploadBox">
                              <div className="libCoverUploadIcon">📷</div>
                              <div className="libCoverUploadText">Tap to upload</div>
                           </label>
                        ) : (
                           <div className="libCoverPreviewWrapper">
                               <img src={draftCover} alt="Cover Preview" className="libCoverPreviewImg" />
                               <label htmlFor="coverUploadInput" className="libCoverChangeBtn">
                                  Change
                               </label>
                           </div>
                        )}
                    </div>
                 </div>
                 
                 {/* DRAGGABLE POSE LIST */}
                 {draftPoses.length === 0 ? (
                    <div className="libDraftEmpty">
                       Tap "+" on poses below to add them here.
                    </div>
                 ) : (
                    <div className="libDraftList">
                       {draftPoses.map((p, i) => (
                          <div key={p.uniqueId} className="libDraftItem">
                             <div className="libDraftItemThumb">
                                {p.image ? <img src={p.image} alt={p.name} /> : '🧘'}
                             </div>
                             <div className="libDraftItemName">{p.name}</div>
                             
                             <button 
                                className="libDraftItemTimeBtn"
                                onClick={() => handleCycleDuration(p.uniqueId)}
                             >
                                ⏱ {p.duration}
                             </button>

                             <button 
                                onClick={() => handleRemoveFromDraft(p.uniqueId)}
                                className="libDraftRemoveBtn"
                             >×</button>
                             <div className="libDraftBadge">
                                {i + 1}
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              {/* POSE PICKER LIST */}
              <h3 className="libSectionTitle">
                 Tap to Add
              </h3>
              <AnimatedList
                  items={visiblePoses}
                  showGradients={false}
                  renderItem={(pose) => (
                    <div onClick={() => handleAddToDraft(pose)} style={{ cursor: 'pointer', marginBottom: '10px' }}>
                      <Card className="libPoseCard" style={{ padding: '10px 16px' }}>
                        <div className="libPoseRow">
                          <div className="libPoseThumb" style={{ width: '48px', height: '48px' }}>
                            {pose.image ? <img src={pose.image} alt={pose.name} /> : <span className="libPoseThumbEmoji">🧘</span>}
                          </div>
                          <div className="libPoseText">
                            <div className="libPoseName" style={{ fontSize: '15px' }}>{pose.name}</div>
                            <div className="libPoseMeta">{pose.duration}</div>
                          </div>
                          <button className="libAddButton">
                            +
                          </button>
                        </div>
                      </Card>
                    </div>
                  )}
                />
            </>
          )}

          {/* --- 2. POSES TAB --- */}
          {!isCreating && (activeTab === "poses" || activeTab === "favorites") && (
            <>
              {loading ? <p className="libEmptyState">Loading...</p> : visiblePoses.length > 0 ? (
                <AnimatedList
                  items={visiblePoses}
                  showGradients={true}
                  displayScrollbar={true}
                  renderItem={(pose) => (
                    <div onClick={() => setSelectedPose(pose)} style={{ cursor: 'pointer' }}>
                      <Card className="libPoseCard">
                        <div className="libPoseRow">
                          <div className="libPoseThumb">
                            {pose.image ? <img src={pose.image} alt={pose.name} /> : <span className="libPoseThumbEmoji">🧘</span>}
                          </div>
                          <div className="libPoseText">
                            <div className="libPoseName">{pose.name}</div>
                            <div className="libPoseMeta">{pose.duration}</div>
                          </div>
                          <button className="libPoseFavoriteBtn" onClick={(e) => { e.stopPropagation(); toggleFavorite(pose.id); }}>
                            <img src={pose.favorite ? StarIconFill : StarIcon} alt="Fav" />
                          </button>
                          <div className="libPoseChevron">›</div>
                        </div>
                      </Card>
                    </div>
                  )}
                />
              ) : <p className="libEmptyState">No poses found.</p>}
            </>
          )}

          {/* --- 3. ROUTINES TAB --- */}
          {!isCreating && activeTab === "routines" && (
            <>
              {!selectedRoutine && (
                <>
                  {/* CREATE NEW BUTTON */}
                  <div 
                    onClick={() => setIsCreating(true)}
                    className="libCreateNewCard"
                  >
                     <div className="libCreateIcon">+</div>
                     <div className="libCreateTitle">Create New Routine</div>
                     <div className="libCreateSub">Mix and match your favorite poses</div>
                  </div>

                  <h3 className="libSectionTitle">My Routines</h3>
                  {loading ? <p className="libEmptyState">Loading routines...</p> : 
                   routines.length === 0 ? <p className="libEmptyState">No routines yet.</p> : (
                    routines.map((routine) => (
                       <SwipeableRoutineCard 
                          key={routine.id}
                          routine={routine}
                          onClick={setSelectedRoutine}
                          onDelete={handleDeleteRoutine}
                       />
                    ))
                   )
                  }
                </>
              )}

              {/* ROUTINE DETAIL VIEW */}
              {selectedRoutine && (
                <>
                   <div className="libDetailContent">
                      <p className="libDetailDesc">{selectedRoutine.description}</p>
                      
                      <div className="libStartWalkContainer">
                          <button 
                             onClick={handleStartRoutineWalk}
                             className="libStartWalkBtn"
                          >
                            Start Walk with this Routine
                          </button>
                      </div>
                   </div>
                   
                   <AnimatedList
                      items={selectedRoutine.poses}
                      showGradients={true}
                      displayScrollbar={true}
                      renderItem={(pose) => (
                        <div onClick={() => setSelectedPose(pose)} style={{ cursor: 'pointer' }}>
                          <Card className="libPoseCard">
                            <div className="libPoseRow">
                              <div className="libPoseThumb">
                                {pose.image ? <img src={pose.image} alt={pose.name} /> : <span className="libPoseThumbEmoji">🧘</span>}
                              </div>
                              <div className="libPoseText">
                                <div className="libPoseName">{pose.name}</div>
                                <div className="libPoseMeta">{pose.duration}</div>
                              </div>
                              <div className="libPoseChevron">›</div>
                            </div>
                          </Card>
                        </div>
                      )}
                   />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}