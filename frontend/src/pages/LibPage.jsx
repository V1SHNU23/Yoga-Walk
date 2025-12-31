import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import Card from "../components/Card.jsx";
import AnimatedList from "../components/AnimatedList.jsx";
import SearchIcon from "../icons/search.svg";
import StarIcon from "../icons/star.svg";
import StarIconFill from "../icons/star-fill.svg";
import BackIcon from "../icons/back.svg"; 

// --- IMAGES (Static Imports used for default data) ---
import imgTadasana from "../assets/tadasana.png";
import imgTree from "../assets/vrksasana.png";
import imgChair from "../assets/utkatasana.png";
import imgW1 from "../assets/Virabhadrasana one.png";
import imgW2 from "../assets/Virabhadrasana two.png";

// --- CONFIG ---
// Removed COVER_OPTIONS
const DURATION_OPTIONS = ["30 sec", "45 sec", "1 min", "2 min", "5 min"];

// --- DEFAULT DATA ---
const DEFAULT_ROUTINES = [
  {
    id: "routine-morning",
    title: "Morning Energy Flow",
    description: "A 5-pose sequence to wake up your body and mind.",
    duration: "5 min",
    poseCount: 5,
    coverImage: imgW1, // Kept for the default example
    poses: [
      {
        id: "rt-1",
        name: "Tadasana", 
        duration: "1 min",
        image: imgTadasana,
        benefits: "Improves posture, strengthens thighs, knees, and ankles. Steadies the mind.",
        instructions: "Stand with feet together or hip width apart, spread toes and press evenly through the feet.\n\nEngage thighs gently, lengthen the spine, relax shoulders and let arms rest by your sides with palms facing in or forward."
      },
      {
        id: "rt-2",
        name: "Vrksasana", 
        duration: "30 sec/side",
        image: imgTree,
        benefits: "Improves balance and stability in the legs.",
        instructions: "Stand tall and shift weight into one foot. Place the sole of the other foot on the inner calf or inner thigh, avoiding the knee."
      },
      {
        id: "rt-3",
        name: "Utkatasana", 
        duration: "30 sec",
        image: imgChair,
        benefits: "Strengthens the ankles, thighs, calves, and spine.",
        instructions: "Stand with feet together. Inhale raise arms overhead. Exhale bend knees and sit hips back."
      },
      {
        id: "rt-4",
        name: "Virabhadrasana I", 
        duration: "45 sec/side",
        image: imgW1,
        benefits: "Stretches the chest and lungs, shoulders and neck.",
        instructions: "Step one foot forward, bend knee. Turn back foot out. Lift arms overhead."
      },
      {
        id: "rt-5",
        name: "Virabhadrasana II", 
        duration: "45 sec/side",
        image: imgW2,
        benefits: "Strengthens and stretches the legs and ankles.",
        instructions: "Step feet wide, turn one foot out and bend front knee. Stretch arms out at shoulder height."
      }
    ]
  }
];

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
  const [draftCover, setDraftCover] = useState(null); // Start with no cover

  // 1. Fetch Poses & Load Local Routines
  useEffect(() => {
    // Load local routines first
    const saved = localStorage.getItem("my_custom_routines");
    if (saved) {
      setRoutines([...DEFAULT_ROUTINES, ...JSON.parse(saved)]);
    } else {
      setRoutines(DEFAULT_ROUTINES);
    }

    // Fetch DB Poses
    fetch('http://127.0.0.1:5000/api/poses')
      .then(res => res.json())
      .then(data => {
        const dbPoses = data.map(pose => ({
          id: pose.id,
          name: pose.name,
          duration: "30 sec", // Default DB duration
          image: pose.animation_url, 
          favorite: false,
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

  // --- BUILDER LOGIC ---
  
  // NEW: Handle file input change
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Basic validation to ensure it's an image
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }

    // Convert file to Base64 string for local storage persistence
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result contains the data:image/png;base64,... string
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

  function handleSaveRoutine() {
    if (!draftTitle.trim()) {
      alert("Please name your routine.");
      return;
    }
    if (draftPoses.length === 0) {
      alert("Please add at least one pose.");
      return;
    }

    const totalMinutes = draftPoses.reduce((acc, p) => {
       if (p.duration.includes("min")) return acc + parseInt(p.duration);
       return acc + 0.5; 
    }, 0);

    const newRoutine = {
      id: `custom-${Date.now()}`,
      title: draftTitle,
      description: `Custom ${draftPoses.length}-pose sequence.`,
      duration: `${Math.ceil(totalMinutes)} min`, 
      poseCount: draftPoses.length,
      poses: draftPoses,
      coverImage: draftCover, // Save the uploaded base64 image
      isCustom: true 
    };

    const updatedRoutines = [...routines, newRoutine];
    setRoutines(updatedRoutines);
    
    const customOnly = updatedRoutines.filter(r => r.isCustom);
    // Warning: Base64 images can be large and might hit localStorage limits eventually.
    // For a prototype/MVP, this is acceptable.
    localStorage.setItem("my_custom_routines", JSON.stringify(customOnly));

    // Reset UI
    setIsCreating(false);
    setDraftTitle("");
    setDraftPoses([]);
    setDraftCover(null);
    setActiveTab("routines");
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
                        {/* Hidden file input */}
                        <input 
                           type="file" 
                           id="coverUploadInput" 
                           accept="image/*" 
                           onChange={handleImageUpload}
                           style={{ display: 'none' }} 
                        />
                        
                        {!draftCover ? (
                           // State 1: No image -> Show Upload Box
                           <label htmlFor="coverUploadInput" className="libCoverUploadBox">
                              <div className="libCoverUploadIcon">📷</div>
                              <div className="libCoverUploadText">Tap to upload from device</div>
                           </label>
                        ) : (
                           // State 2: Image selected -> Show Preview & Change Button
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
                             
                             {/* DURATION TOGGLE */}
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
                    <div onClick={() => handleAddToDraft(pose)} style={{ cursor: 'pointer' }}>
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
                  <AnimatedList
                    items={routines}
                    showGradients={true}
                    renderItem={(routine) => (
                      <div onClick={() => setSelectedRoutine(routine)} style={{ cursor: 'pointer' }}>
                         <Card className="libPoseCard" style={{ marginBottom: '12px' }}>
                            <div className="libPoseRow">
                               <div className="libPoseThumb">
                                  {/* USE THE SELECTED COVER IMAGE HERE */}
                                  {routine.coverImage ? (
                                     <img src={routine.coverImage} alt="Cover" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                  ) : routine.poses[0]?.image ? (
                                     <img src={routine.poses[0].image} alt="Routine" />
                                  ) : (
                                     <span className="libPoseThumbEmoji">📝</span>
                                  )}
                               </div>
                               <div className="libPoseText">
                                  <div className="libPoseName">{routine.title}</div>
                                  <div className="libPoseMeta">{routine.poseCount} poses • {routine.duration}</div>
                               </div>
                               <div className="libPoseChevron">›</div>
                            </div>
                         </Card>
                      </div>
                    )}
                  />
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