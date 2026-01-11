import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; 
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion"; 
import Card from "../components/Card.jsx";
import AnimatedList from "../components/AnimatedList.jsx";
import SearchIcon from "../icons/search.svg";
import StarIcon from "../icons/star.svg";
import StarIconFill from "../icons/star-fill.svg";
import BackIcon from "../icons/back.svg"; 
import BinIcon from "../icons/bin.svg";
import TickIcon from "../icons/tick.svg"; 

// --- CONFIG ---
const API_BASE = "http://127.0.0.1:5000"; 
const DURATION_OPTIONS = ["30 sec", "45 sec", "1 min", "2 min"];

// --- SUB-COMPONENT: CONFIRMATION MODAL ---
function DeleteConfirmationModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="libModalOverlay">
      <motion.div 
        className="libModalCard"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      > 
        <h3 className="libModalTitle">Delete Routine?</h3>
        
        <p className="libModalText">
          Are you sure you want to delete this routine?
        </p>
        <span className="libModalWarning">
          This action cannot be undone.
        </span>

        <div className="libModalActions">
          <button className="libModalBtn cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="libModalBtn delete" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// --- SUB-COMPONENT: SWIPEABLE CARD ---
function SwipeableRoutineCard({ routine, onClick, onDelete }) {
  const x = useMotionValue(0);
  
  // ANIMATION:
  const scale = useTransform(x, [-10, -50], [0.5, 1]);
  const opacity = useTransform(x, [0, -10], [0, 1]);

  return (
    <div className="libSwipeContainer">
      {/* 1. BACKGROUND LAYER: The Narrow Red Pill */}
      <div className="libSwipePillLayer">
        <motion.button 
           className="libSwipeNarrowPillBtn"
           style={{ scale, opacity }}
           onClick={(e) => {
             e.stopPropagation();
             onDelete(routine.id);
           }}
        >
           <img src={BinIcon} alt="Delete" style={{ width: '24px', height: '24px' }} />
        </motion.button>
      </div>

      {/* 2. FOREGROUND CARD */}
      <motion.div
        style={{ x, position: 'relative', zIndex: 1 }}
        drag="x"
        dragConstraints={{ left: -80, right: 0 }} 
        dragElastic={0.1}
        onClick={() => onClick(routine)}
      >
        <Card className="libPoseCard" style={{ margin: 0, background: 'white' }}>
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
  const [routineToDelete, setRoutineToDelete] = useState(null); 

  // --- BUILDER STATE ---
  const [isCreating, setIsCreating] = useState(false);
  const [isRoutineSheetOpen, setIsRoutineSheetOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPoses, setDraftPoses] = useState([]);
  const [draftCover, setDraftCover] = useState(null);
  
  // --- DRAG-TO-DISMISS STATE ---
  const sheetRef = useRef(null);
  const handleRef = useRef(null);
  const dragStartY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const hasDragged = useRef(false); 

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchData();
  }, []);

  // --- DRAG-TO-DISMISS HANDLERS ---
  useEffect(() => {
    if (!isRoutineSheetOpen) return;

    const handle = handleRef.current;
    if (!handle) return;

    const onPointerDown = (e) => {
      isDragging.current = true;
      hasDragged.current = false;
      dragStartY.current = e.clientY || (e.touches && e.touches[0]?.clientY);
      currentY.current = 0;
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'none';
      }
      // Prevent body scroll while dragging
      document.body.style.overflow = 'hidden';
    };

    const onPointerMove = (e) => {
      if (!isDragging.current) return;
      
      // Prevent default scrolling while dragging
      e.preventDefault();
      
      const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
      if (clientY === undefined) return;
      
      const deltaY = clientY - dragStartY.current;
      
      // Only allow dragging down
      if (deltaY > 5) { // Small threshold to distinguish drag from tap
        hasDragged.current = true;
        currentY.current = deltaY;
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translateY(${deltaY}px)`;
        }
      }
    };

    const onPointerUp = () => {
      if (!isDragging.current) return;
      
      const wasDragging = hasDragged.current;
      const dragDistance = currentY.current;
      
      isDragging.current = false;
      
      // Restore body scroll
      document.body.style.overflow = '';
      
      const threshold = 120; // pixels to drag before dismissing
      const viewportThreshold = window.innerHeight * 0.2; // 20% of viewport
      const finalThreshold = Math.max(threshold, viewportThreshold);
      
      if (dragDistance > finalThreshold) {
        // Dismiss sheet (dragged far enough)
        setIsRoutineSheetOpen(false);
        setIsCreating(false);
      } else if (wasDragging) {
        // Snap back (dragged but not far enough)
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
          sheetRef.current.style.transform = 'translateY(0)';
        }
      } else {
        // It was just a tap - close the sheet
        setIsRoutineSheetOpen(false);
        setIsCreating(false);
      }
      
      currentY.current = 0;
      hasDragged.current = false;
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('touchstart', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('touchmove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('touchend', onPointerUp);

    return () => {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('touchend', onPointerUp);
      // Restore body scroll on cleanup
      document.body.style.overflow = '';
    };
  }, [isRoutineSheetOpen]);

  // Reset transform when sheet opens/closes
  useEffect(() => {
    if (sheetRef.current) {
      if (isRoutineSheetOpen) {
        sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        sheetRef.current.style.transform = 'translateY(0)';
      } else {
        sheetRef.current.style.transform = '';
      }
    }
  }, [isRoutineSheetOpen]);

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
          benefits: pose.benefits,
          difficultyTag: pose.difficulty_tag
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

  // Removes a specific item from the draft board (by unique ID)
  function handleRemoveFromDraft(uniqueId) {
    setDraftPoses(prev => prev.filter(p => p.uniqueId !== uniqueId));
  }
  
  // NEW: Removes a pose by its content ID (used for toggling)
  function handleRemoveFromDraftById(poseId) {
    setDraftPoses(prev => prev.filter(p => p.id !== poseId));
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
    .then(async (res) => {
        // Parse error message safely
        const data = await res.json().catch(() => ({})); 

        if (res.ok) {
            fetchData();
            setIsCreating(false);
            setIsRoutineSheetOpen(false);
            setDraftTitle("");
            setDraftPoses([]);
            setDraftCover(null);
            setActiveTab("routines");
        } else {
            console.error("Save Error:", data);
            alert("Failed to save: " + (data.error || "Unknown server error"));
        }
    })
    .catch(err => {
        console.error("Network Error:", err);
        alert("Network Error: " + err.message);
    });
  }

  // --- DELETE LOGIC ---
  
  // 1. Request Deletion (Opens Modal)
  function handleDeleteRequest(id) {
    setRoutineToDelete(id);
  }

  // 2. Confirm Deletion (Performs API Call)
  function confirmDelete() {
    if (!routineToDelete) return;

    // Optimistic UI update
    setRoutines(prev => prev.filter(r => r.id !== routineToDelete));

    fetch(`${API_BASE}/api/routines/${routineToDelete}`, {
        method: "DELETE"
    }).catch(err => {
        alert("Server error deleting routine");
        fetchData(); // Revert if failed
    });
    
    // Close Modal
    setRoutineToDelete(null);
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
            {selectedPose.difficultyTag ? (
              <Card style={{ marginBottom: '15px' }}>
                <h3 className="libCardTitle">Difficulty</h3>
                <p className="libCardText">{selectedPose.difficultyTag}</p>
              </Card>
            ) : null}
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
          {activeTab === "routines" && selectedRoutine ? (
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

        {/* TABS (Hidden if viewing routine details) */}
        {!selectedRoutine && (
          <div className="libTabs">
            <button className={`libTab ${activeTab === "poses" ? "libTabActive" : ""}`} onClick={() => setActiveTab("poses")}>Poses</button>
            <button className={`libTab ${activeTab === "routines" ? "libTabActive" : ""}`} onClick={() => setActiveTab("routines")}>Routines</button>
            <button className={`libTab ${activeTab === "favorites" ? "libTabActive" : ""}`} onClick={() => setActiveTab("favorites")}>Favorites</button>
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="libList">

          {/* --- BOTTOM SHEET: ROUTINE CREATION --- */}
          {isCreating && (
            <div className="libRoutineSheetContainer">
              <div
                ref={sheetRef}
                className={`libRoutineSheet ${
                  isRoutineSheetOpen ? "libRoutineSheetOpen" : "libRoutineSheetCollapsed"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle Bar */}
                <div
                  ref={handleRef}
                  className="libRoutineSheetHandle"
                >
                  <div className="libRoutineSheetHandleBar"></div>
                </div>

                {/* Header Row */}
                <div className="libRoutineSheetHeader">
                  <button 
                    onClick={() => {
                      setIsRoutineSheetOpen(false);
                      setIsCreating(false);
                    }} 
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

                {/* Sheet Body */}
                <div className="libRoutineSheetBody">
                  {/* DRAFT AREA */}
                  <div className="libDraftBoard">
                 <input 
                    type="text" 
                    placeholder="Name your routine..." 
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="libDraftInput"
                 />

                 {/* COVER IMAGE UPLOADER */}
                 <div className="libCoverSection">
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
                              <div className="libCoverUploadText">Tap to upload cover image</div>
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
                 
                 {/* DRAGGABLE POSE LIST - Fixed height container to prevent layout shifts */}
                 <div className="libDraftListContainer">
                   {draftPoses.length === 0 ? (
                      <div className="libDraftEmpty">
                         Tap "+ Add" on poses below to add them here.
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
              </div>

              {/* POSE PICKER LIST */}
              <div className="libTapToAddRow">
                <span className="libTapToAddLabel">TAP TO ADD</span>
                <LibrarySearch value={query} onChange={setQuery} />
              </div>
              
              {/* Scrollable Pose List Container */}
              <div className="libRoutinePoseListContainer">
                <AnimatedList
                    items={visiblePoses}
                    showGradients={false}
                    renderItem={(pose) => {
                      const isAdded = draftPoses.some(p => p.id === pose.id);
                      return (
                          <div onClick={() => setSelectedPose(pose)} style={{ cursor: 'pointer', marginBottom: '10px' }}>
                          <Card className="libPoseCard" style={{ padding: '10px 16px' }}>
                              <div className="libPoseRow">
                              <div className="libPoseThumb" style={{ width: '48px', height: '48px' }}>
                                  {pose.image ? <img src={pose.image} alt={pose.name} /> : <span className="libPoseThumbEmoji">🧘</span>}
                              </div>
                              <div className="libPoseText">
                                  <div className="libPoseName" style={{ fontSize: '15px' }}>{pose.name}</div>
                                  <div className="libPoseMeta">{pose.duration}{pose.difficultyTag ? ` • ${pose.difficultyTag}` : ""}</div>
                              </div>
                              
                              {/* --- TOGGLE BUTTON --- */}
                              <button 
                                  className={`libAddButton ${isAdded ? 'libAddButtonActive' : ''}`}
                                  onClick={(e) => {
                                      e.stopPropagation(); 
                                      if (isAdded) {
                                        // Toggle OFF: Remove from draft
                                        handleRemoveFromDraftById(pose.id);
                                      } else {
                                        // Toggle ON: Add to draft
                                        handleAddToDraft(pose);
                                      }
                                  }}
                              >
                                  {isAdded ? (
                                      <>
                                          <img src={TickIcon} alt="Added" style={{width:'14px', marginRight: '6px', filter: 'brightness(10)'}}/>
                                          Added
                                      </>
                                  ) : "+ Add"}
                              </button>
                              </div>
                          </Card>
                          </div>
                      );
                    }}
                  />
              </div>
                </div>
              </div>
            </div>
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
                            <div className="libPoseMeta">{pose.duration}{pose.difficultyTag ? ` • ${pose.difficultyTag}` : ""}</div>
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
                    onClick={() => {
                      setIsCreating(true);
                      setIsRoutineSheetOpen(true);
                    }}
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
                          onDelete={handleDeleteRequest} 
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
                                <div className="libPoseMeta">{pose.duration}{pose.difficultyTag ? ` • ${pose.difficultyTag}` : ""}</div>
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

        {/* 🟢 CONFIRMATION MODAL */}
        <AnimatePresence>
          {routineToDelete && (
            <DeleteConfirmationModal 
              isOpen={!!routineToDelete}
              onClose={() => setRoutineToDelete(null)}
              onConfirm={confirmDelete}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}