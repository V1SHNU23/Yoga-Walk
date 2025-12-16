import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import Card from "../components/Card.jsx";
import AnimatedList from "../components/AnimatedList.jsx";
import SearchIcon from "../icons/search.svg";
import StarIcon from "../icons/star.svg";
import StarIconFill from "../icons/star-fill.svg";
import BackIcon from "../icons/back.svg"; 

// --- IMAGES (Static Imports) ---
import imgTadasana from "../assets/tadasana.png";
import imgTree from "../assets/vrksasana.png";
import imgChair from "../assets/utkatasana.png";
import imgW1 from "../assets/Virabhadrasana one.png";
import imgW2 from "../assets/Virabhadrasana two.png";


// --- DATA: STATIC ROUTINES ---
const ROUTINES = [
  {
    id: "routine-morning",
    title: "Morning Energy Flow",
    description: "A 5-pose sequence to wake up your body and mind.",
    duration: "5 min",
    poseCount: 5,
    poses: [
      {
        id: "rt-1",
        name: "Tadasana", 
        duration: "1 min",
        image: imgTadasana,
        favorite: false,
        benefits: "Improves posture, strengthens thighs, knees, and ankles. Steadies the mind.",
        instructions: "Stand with feet together or hip width apart, spread toes and press evenly through the feet.\n\nEngage thighs gently, lengthen the spine, relax shoulders and let arms rest by your sides with palms facing in or forward.\n\nKeep your chin level and breathe slowly."
      },
      {
        id: "rt-2",
        name: "Vrksasana", 
        duration: "30 sec/side",
        image: imgTree,
        favorite: false,
        benefits: "Improves balance and stability in the legs. Strengthens ligaments and tendons of the feet.",
        instructions: "Stand tall and shift weight into one foot. Place the sole of the other foot on the inner calf or inner thigh, avoiding the knee.\n\nBring palms together at the chest or raise arms overhead.\n\nKeep gaze steady on one point and breathe evenly."
      },
      {
        id: "rt-3",
        name: "Utkatasana", 
        duration: "30 sec",
        image: imgChair,
        favorite: false,
        benefits: "Strengthens the ankles, thighs, calves, and spine. Stretches shoulders and chest.",
        instructions: "Stand with feet together or hip width apart. As you inhale raise arms overhead.\n\nAs you exhale bend knees and sit the hips back as if into a chair while keeping weight in the heels.\n\nKeep chest lifted and core engaged."
      },
      {
        id: "rt-4",
        name: "Virabhadrasana I", 
        duration: "45 sec/side",
        image: imgW1,
        favorite: false,
        benefits: "Stretches the chest and lungs, shoulders and neck, belly, groins (psoas). Strengthens shoulders and arms, and muscles of the back.",
        instructions: "Step one foot forward and bend the front knee above the ankle.\n\nTurn the back foot out slightly and press the outer edge into the ground.\n\nSquare the hips toward the front and lift arms overhead with the chest open."
      },
      {
        id: "rt-5",
        name: "Virabhadrasana II", 
        duration: "45 sec/side",
        image: imgW2,
        favorite: false,
        benefits: "Strengthens and stretches the legs and ankles. Stretches the groins, chest and lungs, shoulders.",
        instructions: "Step feet wide, turn one foot out and bend the front knee so it stacks over the ankle.\n\nKeep the back leg straight. Stretch arms out at shoulder height and gaze softly over the front hand."
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
  const [poses, setPoses] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [selectedPose, setSelectedPose] = useState(null);       
  const [selectedRoutine, setSelectedRoutine] = useState(null); 

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

  // --- NEW: Handle Start Walk ---
  function handleStartRoutineWalk() {
     if (!selectedRoutine) return;
     // Navigate to Map Page and pass the routine data
     navigate('/map', { state: { routine: selectedRoutine } });
  }

  const visiblePoses = poses.filter((pose) => {
    if (activeTab === "favorites" && !pose.favorite) return false;
    return pose.name.toLowerCase().includes(query.toLowerCase());
  });

  if (selectedPose) {
    return (
      <div className="libPage">
        <div className="libPageInner">
          <div className="libHeader" style={{ justifyContent: 'flex-start', gap: '15px' }}>
            <button 
              onClick={() => setSelectedPose(null)} 
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img src={BackIcon} alt="Back" style={{ width: '24px', height: '24px' }} />
            </button>
            <h1 className="libTitle" style={{ fontSize: '24px' }}>{selectedPose.name}</h1>
          </div>
          <div className="libList" style={{ paddingBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
               {selectedPose.image ? (
                  <img src={selectedPose.image} alt={selectedPose.name} style={{ maxWidth: '100%', borderRadius: '16px', maxHeight: '300px', objectFit: 'contain' }} />
               ) : (
                  <div style={{ fontSize: '80px' }}>🧘</div>
               )}
            </div>
            <Card style={{ marginBottom: '15px' }}>
              <h3 style={{ color: '#61b329', marginTop: 0, marginBottom: '8px' }}>Benefits</h3>
              <p style={{ color: '#526b57', lineHeight: '1.5' }}>{selectedPose.benefits}</p>
            </Card>
            <Card>
              <h3 style={{ color: '#61b329', marginTop: 0, marginBottom: '8px' }}>How to do it</h3>
              <p style={{ color: '#526b57', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{selectedPose.instructions}</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="libPage">
      <div className="libPageInner">
        <div className="libHeader">
          {activeTab === "routines" && selectedRoutine ? (
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={() => setSelectedRoutine(null)} 
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                   <img src={BackIcon} alt="Back" style={{ width: '22px', height: '22px' }} />
                </button>
                <h1 className="libTitle">{selectedRoutine.title}</h1>
             </div>
          ) : (
             <h1 className="libTitle">Pose Library</h1>
          )}
          
          {(activeTab !== "routines" || !selectedRoutine) && (
             <LibrarySearch value={query} onChange={setQuery} />
          )}
        </div>

        {(!selectedRoutine) && (
          <div className="libTabs">
            <button className={`libTab ${activeTab === "poses" ? "libTabActive" : ""}`} onClick={() => setActiveTab("poses")}>Poses</button>
            <button className={`libTab ${activeTab === "routines" ? "libTabActive" : ""}`} onClick={() => setActiveTab("routines")}>Routines</button>
            <button className={`libTab ${activeTab === "favorites" ? "libTabActive" : ""}`} onClick={() => setActiveTab("favorites")}>Favorites</button>
          </div>
        )}

        <div className="libList">
          {(activeTab === "poses" || activeTab === "favorites") && (
            <>
              {loading ? <p className="libEmptyState">Loading...</p> : visiblePoses.length > 0 ? (
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

          {activeTab === "routines" && (
            <>
              {!selectedRoutine && (
                <>
                  <h3 style={{ fontSize: '14px', color: '#6a7a6e', margin: '0 0 8px 4px', textTransform: 'uppercase' }}>Curated Routines</h3>
                  <AnimatedList
                    items={ROUTINES}
                    showGradients={true}
                    renderItem={(routine) => (
                      <div onClick={() => setSelectedRoutine(routine)} style={{ cursor: 'pointer' }}>
                         <Card className="libPoseCard" style={{ marginBottom: '12px' }}>
                            <div className="libPoseRow">
                               <div className="libPoseThumb">
                                  {routine.poses[0]?.image ? <img src={routine.poses[0].image} alt="Routine" /> : <span className="libPoseThumbEmoji">📝</span>}
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

              {selectedRoutine && (
                <>
                   <div style={{ padding: '0 8px 12px 8px' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#526b57', lineHeight: '1.4' }}>{selectedRoutine.description}</p>
                      
                      <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                          <button 
                             onClick={handleStartRoutineWalk}
                             style={{ 
                                 flex: 1,
                                 background: '#61b329', 
                                 color: 'white',
                                 border: 'none', 
                                 padding: '12px',
                                 borderRadius: '999px',
                                 fontSize: '15px',
                                 fontWeight: 'bold',
                                 cursor: 'pointer',
                                 boxShadow: '0 4px 12px rgba(97, 179, 41, 0.3)'
                             }}
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