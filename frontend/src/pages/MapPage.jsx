import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom"; 
import { useAppData } from "../contexts/DataContext";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { Reorder, useDragControls, AnimatePresence, motion } from "motion/react";

// --- Icons ---
import UserLocationIcon from "../icons/User-Location.svg"; 
import UserLocationFillIcon from "../icons/User-Location-Fill.svg"; 
import TickIcon from "../icons/tick.svg"; 
import VolumeIcon from "../icons/volume.svg";
import MuteIcon from "../icons/mute.svg";
import SearchIcon from "../icons/search.svg"; 

import WalkSummaryCard from "../components/WalkSummaryCard";
import SaveRouteModal from "../components/SaveRouteModal.jsx";

// --- CONFIG ---
const defaultCenter = {
  lat: -33.8688, // fallback Sydney
  lng: 151.2093,
};

const WALK_SPEED_KMH = 5;
const DRIVE_SPEED_KMH = 40; 
const STEP_ADVANCE_THRESHOLD = 20;

// --- UTILITY FUNCTIONS ---

function formatDuration(seconds) {
  if (!seconds) return "";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
}

function formatDistance(m) {
  if (m == null) return "";
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function getCountryCodeFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return null;
    if (tz.startsWith("Australia")) return "au";
    if (tz.startsWith("Europe/London")) return "gb";
    if (tz.startsWith("Europe/Berlin")) return "de";
    if (tz.startsWith("Europe/Paris")) return "fr";
    if (tz.startsWith("Asia/Kolkata")) return "in";
    if (tz.startsWith("Asia/Tokyo")) return "jp";
    if (tz.startsWith("Canada")) return "ca";
    if (tz.startsWith("America")) return "us"; 
    return null;
  } catch (e) {
    return null;
  }
}

function offsetPoint(lat, lng, offsetNorthMeters, offsetEastMeters) {
  const dLat = offsetNorthMeters / 111320;
  const dLng =
    offsetEastMeters / (111320 * Math.cos((lat * Math.PI) / 180 || 1));
  return { lat: lat + dLat, lng: lng + dLng };
}

const LABEL_OFFSETS_METERS = [
  { north: 0, east: 0 },
  { north: 140, east: 140 },
  { north: -140, east: -140 },
  { north: 160, east: -120 },
  { north: -160, east: 120 },
  { north: 0, east: 200 },
  { north: 220, east: 0 },
  { north: -220, east: 0 },
];

function distanceMeters(a, b) {
  const R = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function computeCheckpointPositions(coords, count) {
  if (!coords || coords.length < 2 || !count || count <= 0) return [];

  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    const d = distanceMeters(coords[i - 1], coords[i]);
    cum.push(cum[i - 1] + d);
  }

  const total = cum[cum.length - 1];
  if (total === 0) return [];

  const step = total / (count + 1);
  const checkpoints = [];

  for (let k = 1; k <= count; k++) {
    const target = step * k;

    let segIndex = 1;
    while (segIndex < cum.length && cum[segIndex] < target) {
      segIndex++;
    }

    const prevIndex = segIndex - 1;
    const segStart = coords[prevIndex];
    const segEnd = coords[segIndex] || coords[coords.length - 1];
    const segDist = cum[segIndex] - cum[prevIndex] || 1;

    const remaining = target - cum[prevIndex];
    const t = remaining / segDist;

    const lat = segStart.lat + (segEnd.lat - segStart.lat) * t;
    const lng = segStart.lng + (segEnd.lng - segStart.lng) * t;

    checkpoints.push({
      lat,
      lng,
      distanceFromStart: target,
    });
  }

  return checkpoints;
}

function sampleStreetNamePoints(steps, intervalMeters = 100) {
  const streetPoints = [];
  if (!steps || steps.length === 0) return streetPoints;
  
  steps.forEach((step, stepIdx) => {
    if (!step.name || !step.geometry || step.geometry.length < 2 || step.name.trim() === '' || step.name === 'road') {
      return;
    }
    const geometry = step.geometry;
    const cumDist = [0];
    for (let i = 1; i < geometry.length; i++) {
      const d = distanceMeters(geometry[i - 1], geometry[i]);
      cumDist.push(cumDist[i - 1] + d);
    }
    const totalDist = cumDist[cumDist.length - 1];
    if (totalDist === 0) return;
    const numSamples = Math.max(1, Math.floor(totalDist / intervalMeters));
    const sampleStep = totalDist / (numSamples + 1);
    
    for (let k = 1; k <= numSamples; k++) {
      const targetDist = sampleStep * k;
      let segIndex = 1;
      while (segIndex < cumDist.length && cumDist[segIndex] < targetDist) {
        segIndex++;
      }
      const prevIndex = segIndex - 1;
      const segStart = geometry[prevIndex];
      const segEnd = geometry[segIndex] || geometry[geometry.length - 1];
      const segDist = cumDist[segIndex] - cumDist[prevIndex] || 1;
      const remaining = targetDist - cumDist[prevIndex];
      const t = remaining / segDist;
      
      const lat = segStart.lat + (segEnd.lat - segStart.lat) * t;
      const lng = segStart.lng + (segEnd.lng - segStart.lng) * t;
      
      streetPoints.push({
        lat,
        lng,
        name: step.name,
        stepIndex: stepIdx
      });
    }
  });
  return streetPoints;
}

function getRouteMidpoint(route) {
  if (!route || !route.coords || route.coords.length === 0) return null;
  const midIndex = Math.floor(route.coords.length / 2);
  return route.coords[midIndex];
}

function selectDistinctTopRoutes(routes, maxRoutes = 3) {
  if (!routes || routes.length === 0) return [];
  const sorted = [...routes].sort((a, b) => (a.duration || 0) - (b.duration || 0));
  const picked = [];
  const DISTANCE_DIFF_FRACTION = 0.1; 
  const MIDPOINT_PROX_THRESHOLD = 80; 

  for (const route of sorted) {
    if (picked.length >= maxRoutes) break;
    const midA = getRouteMidpoint(route);
    const distA = route.distance || 0;
    let isSimilar = false;
    for (const chosen of picked) {
      const midB = getRouteMidpoint(chosen);
      const distB = chosen.distance || 0;
      const fracDiff = Math.abs(distA - distB) / Math.max(distA, distB, 1);
      let midpointProximity = Infinity;
      if (midA && midB) {
        midpointProximity = distanceMeters(midA, midB);
      }
      if (fracDiff < DISTANCE_DIFF_FRACTION && midpointProximity < MIDPOINT_PROX_THRESHOLD) {
        isSimilar = true;
        break;
      }
    }
    if (!isSimilar) {
      picked.push(route);
    }
  }
  if (picked.length === 0) {
    picked.push(sorted[0]);
  }
  return picked;
}

// --- SUB-COMPONENTS ---

// NEW: Search Focus View (Apple Maps Style)
function SearchFocusView({
  type,
  query,
  onQueryChange,
  results,
  onSelect,
  onClose,
  isOrigin,
  onUseLocation
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus the input when view opens
    if (inputRef.current) {
        // Slight delay to allow animation to start
        setTimeout(() => inputRef.current.focus(), 100);
    }
  }, []);

  return (
    <motion.div 
        className="search-focus-overlay"
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
    >
        <div className="search-focus-header">
            <div className="search-focus-input-wrapper">
                <img 
                  src={SearchIcon} 
                  alt="Search" 
                  className="search-focus-icon-img"
                />
                <input 
                    ref={inputRef}
                    type="text" 
                    className="search-focus-input"
                    placeholder={isOrigin ? "Start Point" : "Where to?"}
                    value={query}
                    onChange={onQueryChange}
                />
                {query.length > 0 && (
                    <button className="search-focus-clear" onClick={() => onQueryChange({ target: { value: "" }})}>×</button>
                )}
            </div>
            <button className="search-focus-cancel" onClick={onClose}>Cancel</button>
        </div>

        <div className="search-focus-body">
            {isOrigin && (
                <div className="search-result-row special" onClick={onUseLocation}>
                    <div className="result-icon-circle blue">
                        <img src={UserLocationIcon} alt="Loc" style={{ width: '20px', filter: 'brightness(0) invert(1)'}} />
                    </div>
                    <div className="result-text-col">
                        <span className="result-title">Current Location</span>
                        <span className="result-subtitle">Use GPS</span>
                    </div>
                </div>
            )}

            {results.map((result, idx) => {
                const title = result.address.road || result.display_name.split(",")[0];
                const subtitle = result.display_name;
                
                return (
                    <div key={idx} className="search-result-row" onClick={() => onSelect(result)}>
                        <div className="result-icon-circle">📍</div>
                        <div className="result-text-col">
                            <span className="result-title">{title}</span>
                            <span className="result-subtitle">{subtitle}</span>
                        </div>
                    </div>
                );
            })}
            
            {results.length === 0 && query.length > 2 && (
                <div className="search-empty-state">
                    <p>No results found for "{query}"</p>
                </div>
            )}
        </div>
    </motion.div>
  );
}

function GripIcon({ dragControls }) {
  return (
    <div 
      className="drag-handle"
      onPointerDown={(e) => dragControls.start(e)}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
        <path d="M2 6H18M2 10H18M2 14H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const DraggableItem = ({ value, children }) => {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={value}
      dragListener={false} 
      dragControls={dragControls} 
      className="draggable-item"
    >
      {children(dragControls)} 
    </Reorder.Item>
  );
};

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

function MapViewTracker({ onZoomChange }) {
  const map = useMap();
  const lastZoomRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  
  useEffect(() => {
    const updateZoom = () => {
      const zoom = map.getZoom();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        if (lastZoomRef.current === null || Math.abs(zoom - lastZoomRef.current) > 0.1) {
          lastZoomRef.current = zoom;
          onZoomChange(zoom);
        }
      }, 100);
    };
    const initialZoom = map.getZoom();
    lastZoomRef.current = initialZoom;
    onZoomChange(initialZoom);
    map.on('zoomend', updateZoom);
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      map.off('zoomend', updateZoom);
    };
  }, [map, onZoomChange]);
  
  return null;
}

function UserLocationButton({ userLocation, setHeading, isWalking }) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    if (btnRef.current) {
      L.DomEvent.disableClickPropagation(btnRef.current);
      L.DomEvent.disableScrollPropagation(btnRef.current);
    }
  }, []);

  const handleLocate = (e) => {
    setIsLocating(true);
    setTimeout(() => {
      setIsLocating(false);
    }, 100);

    if (userLocation) {
      map.setView(userLocation, 16, { animate: true });
    } else {
      alert("Waiting for location...");
    }

    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      DeviceOrientationEvent.requestPermission()
        .then((response) => {
          if (response !== "granted") {
            console.warn("Compass permission denied");
          }
        })
        .catch(console.error);
    }
  };

  return (
    <button
      ref={btnRef} 
      className={`user-location-btn ${isWalking ? 'walking' : 'not-walking'}`}
      onClick={handleLocate}
    >
      <img 
        src={isLocating ? UserLocationFillIcon : UserLocationIcon} 
        alt="Locate Me" 
        draggable="false"
      />
    </button>
  );
}

function VoiceToggleButton({ voiceEnabled, toggleVoice, isWalking }) {
  const btnRef = useRef(null);

  useEffect(() => {
    if (btnRef.current) {
      L.DomEvent.disableClickPropagation(btnRef.current);
      L.DomEvent.disableScrollPropagation(btnRef.current);
    }
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={toggleVoice}
      aria-label="Toggle Voice Guidance"
      className={`voice-toggle-btn ${isWalking ? 'walking' : 'not-walking'} ${voiceEnabled ? 'enabled' : ''}`}
    >
      <img 
        src={voiceEnabled ? VolumeIcon : MuteIcon} 
        alt={voiceEnabled ? "Voice On" : "Voice Muted"}
        draggable="false"
      />
    </button>
  );
}

function TravelModeButtons({ travelMode, onToggle, isWalking }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const handleModeClick = (e, mode) => {
    e.stopPropagation();
    e.preventDefault(); 
    if (e.nativeEvent) {
        e.nativeEvent.stopPropagation();
    }
    onToggle(mode);
  };

  if (isWalking) return null;

  return (
    <div ref={containerRef} className="travel-mode-container">
      <button
        onClick={(e) => handleModeClick(e, "driving")}
        className={`mode-btn ${travelMode === "driving" ? "active" : ""}`}
        title="Car Route"
        type="button" 
      >
        🚗
      </button>
      <button
        onClick={(e) => handleModeClick(e, "foot")}
        className={`mode-btn ${travelMode === "foot" ? "active" : ""}`}
        title="Walking Route"
        type="button"
      >
        🚶
      </button>
    </div>
  );
}

function makeCheckpointIcon(number) {
  return L.divIcon({
    className: "checkpoint-number",
    html: `
      <div class="checkpoint-number-inner">
        ${number}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createDurationIcon(durationSeconds, isActive) {
  let text = "";
  const minutes = Math.round(durationSeconds / 60);
  if (minutes < 60) {
    text = `${minutes} min`;
  } else {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    text = mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
  }

  return L.divIcon({
    className: "route-label-icon", 
    html: `<div class="route-label-pill ${isActive ? 'active' : ''}">${text}</div>`,
    iconSize: [null, null], 
    iconAnchor: [20, 10] 
  });
}

function createStreetNameIcon(streetName) {
  return L.divIcon({
    className: "street-name-label-icon",
    html: `<div class="street-name-label">${streetName}</div>`,
    iconSize: [null, null],
    iconAnchor: [0, 0]
  });
}

// --- MAIN COMPONENT ---

export default function MapPage() {
  const location = useLocation(); 
  const { refreshData } = useAppData();
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  
  const [map, setMap] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [checkpointCount, setCheckpointCount] = useState(5);

  const [checkpoints, setCheckpoints] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);

  // --- TRAVEL MODE STATE ---
  const [travelMode, setTravelMode] = useState("foot");

  // --- ROUTINE & THEME STATE ---
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [themes, setThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState("");

  // Active Walk State
  const [isWalking, setIsWalking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Overlay State
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [visitedIndices, setVisitedIndices] = useState(new Set()); 

  // --- REFLECTION STATE (UPDATED FOR 3 ANSWERS) ---
  const [reflections, setReflections] = useState({}); 
  const [tempAnswers, setTempAnswers] = useState({ a1: "", a2: "", a3: "" });
  
  // NEW: Track which step of the reflection we are on (1, 2, or 3)
  const [questionStep, setQuestionStep] = useState(1);
  
  // --- SWIPEABLE CARD STATE ---
  const [activeSlide, setActiveSlide] = useState(0); 
  const slidesRef = useRef(null); 
  const [isZooming, setIsZooming] = useState(false);
  const isMounted = useRef(false);

  // Street Name Visibility
  const [showStreetNames, setShowStreetNames] = useState(false);
  const [allStreetNameMarkers, setAllStreetNameMarkers] = useState([]);
  
  const ZOOM_SHOW_THRESHOLD = 16.5;
  const ZOOM_HIDE_THRESHOLD = 15.5;
  
  const currentZoomRef = useRef(13);
  const isWalkingRef = useRef(isWalking);
  const showStreetNamesRef = useRef(false);
  
  // --- FOCUS SEARCH STATE ---
  const [activeSearchField, setActiveSearchField] = useState(null); // 'origin' | 'destination' | null

  useEffect(() => {
    isWalkingRef.current = isWalking;
    if (!isWalking) {
      showStreetNamesRef.current = false;
      setShowStreetNames(false);
    }
  }, [isWalking]);
  
  const handleZoomChange = useRef((zoom) => {
    if (!isWalkingRef.current) {
      if (showStreetNamesRef.current) {
        showStreetNamesRef.current = false;
        setShowStreetNames(false);
      }
      return;
    }
    const previousZoom = currentZoomRef.current;
    currentZoomRef.current = zoom;
    if (showStreetNamesRef.current) {
      if (zoom < ZOOM_HIDE_THRESHOLD) {
        showStreetNamesRef.current = false;
        setShowStreetNames(false);
      }
    } else {
      if (zoom >= ZOOM_SHOW_THRESHOLD) {
        showStreetNamesRef.current = true;
        setShowStreetNames(true);
      }
    }
  }).current;

  // --- LOCATION & HEADING ---
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const saved = localStorage.getItem("lastKnownLocation");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [hasCenteredOnLoad, setHasCenteredOnLoad] = useState(false);
  const [heading, setHeading] = useState(0); 
  const [geoError, setGeoError] = useState("");
  const [isOriginCurrentLocation, setIsOriginCurrentLocation] = useState(false);

  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState(""); 
  const [searchResults, setSearchResults] = useState([]); 
  const [originQuery, setOriginQuery] = useState("");
  const [originResults, setOriginResults] = useState([]);

  // --- DRAG ORDER STATE ---
  const [fieldOrder, setFieldOrder] = useState(["origin", "destination"]);

  // --- DRAG SCROLL STATE ---
  const routesContainerRef = useRef(null);
  const [isDraggingRoute, setIsDraggingRoute] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [userCountryCode, setUserCountryCode] = useState(null);

  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [checkpointPositions, setCheckpointPositions] = useState([]);
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectionStep, setSelectionStep] = useState("destination");
  const [showRouteSelection, setShowRouteSelection] = useState(false);
  const [showDirections, setShowDirections] = useState(false);

  // Summary Card State
  const [showSummary, setShowSummary] = useState(false);
  const [finalMetrics, setFinalMetrics] = useState(null);
  const [isSaveRouteModalOpen, setIsSaveRouteModalOpen] = useState(false);
  const [saveRouteDestinationLabel, setSaveRouteDestinationLabel] = useState("");
  const hasSavedWalkRef = useRef(false);

  // --- VOICE GUIDANCE STATE ---
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const voiceEnabledRef = useRef(voiceEnabled);

  const lastStepChangeRef = useRef(Date.now());
  const searchTimeoutRef = useRef(null);
  const walkStartTimeRef = useRef(null);
  const debounceFetchRef = useRef(null);

  // --- FETCH JOURNEY DATA HELPER ---
  const fetchJourneyData = async (org, dst, count) => {
      const payload = {
        origin: org,
        destination: dst,
        checkpoint_count: count,
      };

      const res = await fetch(`${apiBase}/api/journey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to load checkpoints from server");
      }

      const data = await res.json();
      let finalCheckpoints = data.checkpoints || [];

      // Routine Logic Override
      if (activeRoutine && activeRoutine.poses.length > 0) {
          finalCheckpoints = finalCheckpoints.map((cp, index) => {
              const poseIndex = index % activeRoutine.poses.length;
              const routinePose = activeRoutine.poses[poseIndex];
              return {
                  ...cp,
                  exercise: {
                      name: routinePose.name,
                      duration: routinePose.duration || "30 sec",
                      benefits: routinePose.benefits,
                      instructions: routinePose.instructions,
                      gif: routinePose.image || routinePose.gif,
                      difficultyTag: routinePose.difficultyTag
                  }
              };
          });
      }

      // Theme Logic
      if (selectedThemeId) {
          try {
              const qRes = await fetch(`${apiBase}/api/theme/${selectedThemeId}/questions`);
              const questions = await qRes.json();
              if (questions && questions.length > 0) {
                    finalCheckpoints = finalCheckpoints.map((cp, i) => ({
                        ...cp,
                        reflection_question: questions[i % questions.length] 
                    }));
              }
          } catch (qErr) {
              console.warn("Failed to fetch reflection questions", qErr);
          }
      }
      return finalCheckpoints;
  };

  // --- EFFECTS ---
  
  useEffect(() => {
    if (isWalking || routes.length === 0 || !origin || !destination) return;
    if (activeRoutine) return;

    if (checkpoints.length !== checkpointCount) {
        if (debounceFetchRef.current) clearTimeout(debounceFetchRef.current);
        debounceFetchRef.current = setTimeout(async () => {
            try {
                const newData = await fetchJourneyData(origin, destination, checkpointCount);
                setCheckpoints(newData);
            } catch (err) {
                console.error("Failed to sync checkpoints", err);
            }
        }, 600); 
    }
  }, [checkpointCount, isWalking, routes, origin, destination, activeRoutine, checkpoints.length]);


  useEffect(() => {
    fetch(`${apiBase}/api/themes`)
        .then(res => res.json())
        .then(data => {
            setThemes(data);
            if (data && data.length > 0) {
                setSelectedThemeId(data[0].id);
            }
        })
        .catch(err => console.error("Failed to fetch themes", err));
  }, []);

  useEffect(() => {
    if (!location.state) return;

    if (location.state.savedRoute) {
      const savedRoute = location.state.savedRoute;
      if (savedRoute.destination) setDestination(savedRoute.destination);
      if (savedRoute.destinationLabel) setDestinationLabel(savedRoute.destinationLabel);
      if (savedRoute.routes && savedRoute.routes.length > 0) {
        setRoutes(savedRoute.routes);
        setActiveRouteIndex(savedRoute.activeRouteIndex || 0);
      }
      setSelectionStep("done");
      setSheetOpen(true);
      setSearchQuery(savedRoute.destinationLabel || "");
      return;
    }

    if (location.state.routine) {
      const routine = location.state.routine;
      setActiveRoutine(routine);
      setCheckpointCount(routine.poses.length);
      setRoutes([]);
      setCheckpoints([]);
    }
  }, [location.state]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
    if (!voiceEnabled) {
      window.speechSynthesis.cancel();
    }
  }, [voiceEnabled]);

  const speak = (text) => {
    if (
        !voiceEnabledRef.current || 
        !window.speechSynthesis || 
        !window.SpeechSynthesisUtterance
    ) return;
    
    window.speechSynthesis.cancel(); 
    try {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn("Speech synthesis failed", e);
    }
  };

  useEffect(() => {
    if (map && userLocation && !hasCenteredOnLoad) {
      map.setView(userLocation, 15, { animate: false });
      setHasCenteredOnLoad(true);
    }
  }, [map, userLocation, hasCenteredOnLoad]);

  // UPDATED: Load previous answers (if any) when a checkpoint is opened
  useEffect(() => {
    if (selectedCheckpoint) {
      setActiveSlide(0);
      setQuestionStep(1); // RESET the Question Step to 1 on open
      
      const prev = reflections[selectedCheckpoint.index] || {};
      setTempAnswers({
        a1: prev.a1 || "",
        a2: prev.a2 || "",
        a3: prev.a3 || ""
      });

      if (slidesRef.current) {
        slidesRef.current.scrollTo({ left: 0, behavior: 'auto' });
      }
    }
  }, [selectedCheckpoint]);

  useEffect(() => {
    if (destinationLabel) {
      setSearchQuery(destinationLabel);
    }
  }, [destinationLabel]);

  useEffect(() => {
    if (originLabel) {
      setOriginQuery(originLabel);
    }
  }, [originLabel]);

  useEffect(() => {
    const savedState = localStorage.getItem("activeWalkState");
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            if (parsed.origin) setOrigin(parsed.origin);
            if (parsed.destination) setDestination(parsed.destination);
            if (parsed.routes) setRoutes(parsed.routes);
            if (parsed.checkpoints) setCheckpoints(parsed.checkpoints);
            if (parsed.checkpointPositions) setCheckpointPositions(parsed.checkpointPositions);
            if (parsed.isWalking) setIsWalking(parsed.isWalking);
            if (parsed.currentStep) setCurrentStep(parsed.currentStep);
            if (parsed.activeRouteIndex) setActiveRouteIndex(parsed.activeRouteIndex);
            if (parsed.visitedIndices) setVisitedIndices(new Set(parsed.visitedIndices));
            if (parsed.startTime) walkStartTimeRef.current = parsed.startTime;
            if (parsed.selectionStep) setSelectionStep(parsed.selectionStep);
            if (parsed.sheetOpen) setSheetOpen(parsed.sheetOpen);
            if (parsed.originLabel) setOriginLabel(parsed.originLabel);
            if (parsed.destinationLabel) setDestinationLabel(parsed.destinationLabel);
            if (parsed.voiceEnabled !== undefined) setVoiceEnabled(parsed.voiceEnabled);
            if (parsed.reflections) setReflections(parsed.reflections);
            if (parsed.travelMode) setTravelMode(parsed.travelMode); 
        } catch (e) {
            console.error("Failed to restore walk state", e);
        }
    }
  }, []);

  useEffect(() => {
    if (!isMounted.current) {
        isMounted.current = true;
        return;
    }
    if (origin || destination) {
        const stateToSave = {
            origin,
            destination,
            routes,
            checkpoints,
            checkpointPositions,
            isWalking,
            currentStep,
            activeRouteIndex,
            visitedIndices: Array.from(visitedIndices), 
            startTime: walkStartTimeRef.current,
            selectionStep,
            sheetOpen,
            originLabel,
            destinationLabel,
            voiceEnabled,
            reflections,
            travelMode 
        };
        localStorage.setItem("activeWalkState", JSON.stringify(stateToSave));
    } else {
        localStorage.removeItem("activeWalkState");
    }
  }, [origin, destination, routes, checkpoints, checkpointPositions, isWalking, currentStep, activeRouteIndex, visitedIndices, selectionStep, sheetOpen, originLabel, destinationLabel, voiceEnabled, reflections, travelMode]);

  const handleSlideScroll = () => {
    if (slidesRef.current) {
      const { scrollLeft, clientWidth } = slidesRef.current;
      const pageIndex = Math.round(scrollLeft / clientWidth);
      setActiveSlide(pageIndex);
    }
  };

  const scrollToSlide = (index) => {
    if (slidesRef.current) {
      slidesRef.current.scrollTo({
        left: slidesRef.current.clientWidth * index,
        behavior: 'smooth'
      });
    }
  };

  const startDragging = (e) => {
    setIsDraggingRoute(true);
    setStartX(e.pageX - routesContainerRef.current.offsetLeft);
    setScrollLeft(routesContainerRef.current.scrollLeft);
  };

  const stopDragging = () => {
    setIsDraggingRoute(false);
  };

  const onDragMove = (e) => {
    if (!isDraggingRoute) return;
    e.preventDefault();
    const x = e.pageX - routesContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    routesContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleReorder = (newOrder) => {
    setFieldOrder(newOrder);
    if (newOrder[0] !== fieldOrder[0]) {
      handleSwapLocations();
      setTimeout(() => {
        setFieldOrder(["origin", "destination"]);
      }, 300);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
        try {
            let biasParams = "";
            let countryFilter = userCountryCode ? `&countrycodes=${userCountryCode}` : ""; 
            const searchCenter = userLocation || defaultCenter;
            
            if (searchCenter) {
                const minLon = searchCenter.lng - 0.5;
                const minLat = searchCenter.lat - 0.5;
                const maxLon = searchCenter.lng + 0.5;
                const maxLat = searchCenter.lat + 0.5;
                const isBounded = userLocation ? "&bounded=1" : "";
                biasParams = `&viewbox=${minLon},${maxLat},${maxLon},${minLat}${isBounded}`; 
            }

            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5${biasParams}${countryFilter}`;
            const res = await fetch(url);
            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            console.error("Autocomplete failed", err);
        }
    }, 100); 
  };

  const selectSearchResult = (result) => {
    const newDest = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setDestination(newDest);
    
    const name = result.address.road || result.display_name.split(",")[0];
    const suburb = result.address.suburb || result.address.city || result.address.state || "";
    const label = suburb ? `${name}, ${suburb}` : name;

    setDestinationLabel(label);
    setSearchQuery(label);
    setSearchResults([]);
    setActiveSearchField(null); // Close the overlay
    setSelectionStep("done");
    setSheetOpen(true);
  };

  const handleOriginSearch = (e) => {
    const query = e.target.value;
    setOriginQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setOriginResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let biasParams = "";
        let countryFilter = userCountryCode ? `&countrycodes=${userCountryCode}` : "";
        const searchCenter = userLocation || defaultCenter;

        if (searchCenter) {
             const minLon = searchCenter.lng - 0.5;
             const minLat = searchCenter.lat - 0.5;
             const maxLon = searchCenter.lng + 0.5;
             const maxLat = searchCenter.lat + 0.5;
             const isBounded = userLocation ? "&bounded=1" : "";
             biasParams = `&viewbox=${minLon},${maxLat},${maxLon},${minLat}${isBounded}`;
        }
        
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5${biasParams}${countryFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        setOriginResults(data);
      } catch (err) {
        console.error("Origin search failed", err);
      }
    }, 100);
  };

  const selectOriginResult = (result) => {
    const newOrigin = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setOrigin(newOrigin);
    const name = result.address.road || result.display_name.split(",")[0];
    const suburb = result.address.suburb || result.address.city || "";
    const label = suburb ? `${name}, ${suburb}` : name;
    setOriginLabel(label);
    setOriginQuery(label);
    setOriginResults([]);
    setActiveSearchField(null); // Close the overlay
    setIsOriginCurrentLocation(false);
  };

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Location is not supported by your browser.");
      return;
    }

    const handleLocationError = (err) => {
      console.error("Geolocation error:", err);
      let errorMessage = "Could not access your location.";
      
      switch(err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = "Location permission denied. Please allow location access in your browser settings.";
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = "Location information unavailable. Check your device location settings.";
          break;
        case err.TIMEOUT:
          errorMessage = "Location request timed out. Please try again.";
          break;
        default:
          errorMessage = "Could not access your location.";
      }
      
      if (!userLocation) {
        setGeoError(errorMessage);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newLoc = { lat: latitude, lng: longitude };
        setUserLocation(newLoc);
        localStorage.setItem("lastKnownLocation", JSON.stringify(newLoc));
        setGeoError("");
      },
      handleLocationError,
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newLoc = { lat: latitude, lng: longitude };
        setUserLocation(newLoc);
        setGeoError("");
        localStorage.setItem("lastKnownLocation", JSON.stringify(newLoc));
        if (pos.coords.heading && !heading) {
           setHeading(pos.coords.heading);
        }
      },
      handleLocationError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    const handleOrientation = (e) => {
      let compass = e.webkitCompassHeading || Math.abs(e.alpha - 360);
      if(compass) setHeading(compass);
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  const createLocationIcon = (headingValue) => {
    return L.divIcon({
      className: "user-location-puck",
      html: `
        <div class="user-puck-heading" style="transform: translateX(-50%) rotate(${headingValue}deg);"></div>
        <div class="user-puck-dot"></div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20], 
    });
  };

  useEffect(() => {
    const setCodeFromGeo = async () => {
      if (!userLocation) return;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${userLocation.lat}&lon=${userLocation.lng}&format=json`
        );
        const data = await res.json();
        const code = data.address?.country_code?.toUpperCase();
        if (code) setUserCountryCode(code);
      } catch (err) {
        console.error("Failed to get country code", err);
      }
    };

    if (userLocation) {
      setCodeFromGeo();
    } else if (!userCountryCode) {
      const tzCode = getCountryCodeFromTimezone();
      if (tzCode) setUserCountryCode(tzCode);
    }
  }, [userLocation, userCountryCode]);

  useEffect(() => {
    if (!isWalking || !userLocation || !routes[activeRouteIndex]) return;

    const activeRoute = routes[activeRouteIndex];
    if (!activeRoute.steps || activeRoute.steps.length === 0) return;
    if (currentStep >= activeRoute.steps.length - 1) return;

    const targetStep = activeRoute.steps[currentStep + 1];
    
    if (targetStep && targetStep.maneuver && targetStep.maneuver.location) {
      const targetCoords = {
        lat: targetStep.maneuver.location[1],
        lng: targetStep.maneuver.location[0]
      };
      const dist = distanceMeters(userLocation, targetCoords);
      if (dist < STEP_ADVANCE_THRESHOLD) {
        if (Date.now() - lastStepChangeRef.current > 3000) {
          advanceStep();
          lastStepChangeRef.current = Date.now();
        }
      }
    }
  }, [userLocation, isWalking, currentStep, routes, activeRouteIndex]);

  useEffect(() => {
    if (isWalking && routes[activeRouteIndex]) {
        const currentInstruction = routes[activeRouteIndex].steps?.[currentStep]?.instruction;
        if (currentInstruction) {
            speak(currentInstruction);
        }
    }
  }, [currentStep, isWalking, activeRouteIndex, routes]);

  useEffect(() => {
    if (!isWalking || !userLocation || checkpointPositions.length === 0) return;
    checkpointPositions.forEach((pos, idx) => {
      if (visitedIndices.has(idx)) return;
      const dist = distanceMeters(userLocation, pos);
      if (dist < 20) {
        const cpData = checkpoints[idx];
        if (cpData) {
          setSelectedCheckpoint({ ...cpData, index: idx + 1 });
        }
        setVisitedIndices(prev => new Set(prev).add(idx));
        if (navigator.vibrate) navigator.vibrate(200);
      }
    });
  }, [userLocation, isWalking, checkpointPositions, visitedIndices, checkpoints]);

  useEffect(() => {
    if (!isWalking || !userLocation || !destination) return;
    const distToEnd = distanceMeters(userLocation, destination);
    if (distToEnd < 30) {
       handleStopNavigation();
    }
  }, [userLocation, destination, isWalking]);

  useEffect(() => {
    if (map && userLocation && !hasCenteredOnLoad) {
      map.setView(userLocation, 15, { animate: false }); 
      setHasCenteredOnLoad(true);
    }
  }, [map, userLocation, hasCenteredOnLoad]);

  function advanceStep() {
    const activeRoute = routes[activeRouteIndex];
    if (activeRoute && activeRoute.steps && currentStep < activeRoute.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }

  function updateCheckpointPositionsForRoute(route, count) {
    if (!route) {
      setCheckpointPositions([]);
      return;
    }
    const positions = computeCheckpointPositions(route.coords, count);
    setCheckpointPositions(positions);
  }

  function fitMapToRoute(customRoutes = null) {
    const routesToUse = customRoutes || routes;
    
    if (map && routesToUse.length > 0 && origin && destination) {
        const allCoords = [];
        routesToUse.forEach((route) => {
          if (route.coords) allCoords.push(...route.coords);
        });
        allCoords.push(origin, destination);

        if (allCoords.length > 0) {
          const bounds = L.latLngBounds(allCoords);
          
          map.invalidateSize(); 

          const topPad = window.innerHeight * 0.10; 
          const bottomPad = window.innerHeight * 0.50;
          const sidePad = window.innerHeight * 0.025; 

          map.fitBounds(bounds, {
            paddingTopLeft: [sidePad, topPad],
            paddingBottomRight: [sidePad, bottomPad],
            maxZoom: 18, 
            animate: true,
            duration: 0.8, 
          });
        }
    }
  }

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      if (data.address) {
        if (data.address.road && data.address.suburb) {
          return `${data.address.road}, ${data.address.suburb}`;
        }
        return data.display_name.split(",").slice(0, 3).join(", ");
      }
      return "Unknown location";
    } catch (err) {
      return "Unknown location";
    }
  }

  async function handleUseMyLocation() {
    setOriginQuery("Locating...");
    setActiveSearchField(null); // Close the overlay immediately
    let loc = userLocation;
    if (!loc) {
      if (!("geolocation" in navigator)) {
        setErrorMsg("Browser location not supported.");
        return;
      }
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
          })
        );
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
      } catch (err) {
        setErrorMsg("Could not access your location.");
        setOriginQuery("");
        return;
      }
    }
    setOrigin(loc);
    setIsOriginCurrentLocation(true); 
    const label = await reverseGeocode(loc.lat, loc.lng);
    setOriginLabel(label);
    setOriginQuery(label);
    setSelectionStep("done");
    setErrorMsg("");
    setSheetOpen(true);
  }

  async function fetchSingleRoute(pointList, mode) {
    const coordString = pointList.map((p) => `${p.lng},${p.lat}`).join(";");
    
    // Switch URL based on mode
    const profile = mode === 'driving' ? 'driving' : 'foot';
    const speed = mode === 'driving' ? DRIVE_SPEED_KMH : WALK_SPEED_KMH;

    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordString}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not get route");
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) throw new Error("No route found");

    return data.routes.map(route => {
        const coords = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
        const distance = route.distance;
        
        // Calculate duration based on mode speed
        const durationSeconds = (distance * 3.6) / speed;
        
        const steps = route.legs[0].steps.map(step => {
          const stepGeometry = step.geometry?.coordinates || [];
          const stepCoords = stepGeometry.map(([lng, lat]) => ({ lat, lng }));
          
          let instructionText = "";
          if (mode === 'foot') {
              instructionText = step.maneuver.type === 'depart' 
                ? `Start walking ${step.maneuver.modifier || 'forward'} on ${step.name || 'path'}`
                : `${step.maneuver.type} ${step.maneuver.modifier || ''} ${step.name ? 'along ' + step.name : ''}`;
          } else {
              instructionText = step.maneuver.type === 'depart' 
                ? `Drive ${step.maneuver.modifier || 'forward'} on ${step.name || 'road'}`
                : `Turn ${step.maneuver.modifier || ''} onto ${step.name || 'road'}`;
          }

          return {
            instruction: instructionText,
            distance: step.distance,
            maneuver: step.maneuver,
            name: step.name,
            location: step.maneuver.location ? {
              lat: step.maneuver.location[1],
              lng: step.maneuver.location[0]
            } : null,
            geometry: stepCoords 
          };
        });
        return { coords, distance, duration: durationSeconds, steps };
    });
  }

  async function fetchRoutes(originPoint, destinationPoint, mode) {
    const routesList = [];
    const timestamp = Date.now(); 
    let idCounter = 0;
    try {
      const directs = await fetchSingleRoute([originPoint, destinationPoint], mode);
      directs.forEach(route => {
          routesList.push({ id: `${timestamp}-${idCounter++}`, ...route });
      });
    } catch (e) {
      console.warn("Direct route failed", e);
    }
    const midLat = (originPoint.lat + destinationPoint.lat) / 2;
    const midLng = (originPoint.lng + destinationPoint.lng) / 2;
    const viaCandidates = [
      offsetPoint(midLat, midLng, 250, 0),
      offsetPoint(midLat, midLng, -250, 0),
      offsetPoint(midLat, midLng, 0, 250),
      offsetPoint(midLat, midLng, 0, -250),
    ];
    for (const via of viaCandidates) {
      if (routesList.length >= 6) break;
      try {
        const viaRoutes = await fetchSingleRoute([originPoint, via, destinationPoint], mode);
        viaRoutes.forEach(route => {
             routesList.push({ id: `${timestamp}-${idCounter++}`, ...route });
        });
      } catch (e) {}
    }
    if (!routesList.length) throw new Error("No route found");
    return selectDistinctTopRoutes(routesList, 3);
  }

  // --- HANDLER: GENERATE JOURNEY ---
  async function handleSubmit(e, customMode = null) {
    if (e) e.preventDefault();
    const modeToUse = customMode || travelMode;

    console.log("🟢 Finding Routes. Mode:", modeToUse);
    
    if (!origin || !destination) {
      if (!origin && originQuery.length > 0) {
        setErrorMsg("Please select a starting point.");
      } else if (!destination && searchQuery.length > 0) {
        setErrorMsg("Please select a destination.");
      } else {
        setErrorMsg("Please choose destination and starting point.");
      }
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Fetch Routes (OSRM)
      const routeOptions = await fetchRoutes(origin, destination, modeToUse);
      
      setRoutes(routeOptions);
      setActiveRouteIndex(0);
      setShowRouteSelection(true); 
      setShowDirections(false); 

      const selectedRoute = routeOptions[0];

      // 2. Smart Checkpoint Count (1 per KM)
      let countToUse;
      if (activeRoutine) {
        countToUse = activeRoutine.poses.length;
      } else {
        const distanceKm = selectedRoute.distance / 1000;
        // Default: 1 per km, minimum 1, MAXIMUM 10
        countToUse = Math.min(10, Math.max(1, Math.round(distanceKm)));
        setCheckpointCount(countToUse); // Update the slider UI
      }
      
      // 3. Render the dots immediately using the calculated count
      updateCheckpointPositionsForRoute(selectedRoute, countToUse);
      
      // 4. Fetch the checkpoint data (Poses/Questions)
      // We explicitly call this here to ensure immediate loading
      const finalCheckpoints = await fetchJourneyData(origin, destination, countToUse);
      setCheckpoints(finalCheckpoints);
      
      // Reset walk states
      setVisitedIndices(new Set()); 
      setReflections({});
      
      // ... Street Name Logic ...
      if (routeOptions[0] && routeOptions[0].steps) {
        const sampledPoints = sampleStreetNamePoints(routeOptions[0].steps, 100);
        const pointsByStreet = {};
        sampledPoints.forEach(point => {
          if (!pointsByStreet[point.name]) {
            pointsByStreet[point.name] = [];
          }
          pointsByStreet[point.name].push(point);
        });
        const markers = Object.keys(pointsByStreet).map(streetName => {
          const points = pointsByStreet[streetName];
          const middleIndex = Math.floor(points.length / 2);
          const selectedPoint = points[middleIndex] || points[0];
          return {
            ...selectedPoint,
            streetName,
            key: `street-${routeOptions[0].id}-${streetName}`
          };
        });
        setAllStreetNameMarkers(markers);
      } else {
        setAllStreetNameMarkers([]);
      }
      
      setSheetOpen(true);
      
      setTimeout(() => {
        fitMapToRoute(routeOptions);
      }, 300);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to find route");
      setCheckpoints([]);
      setCheckpointPositions([]);
    } finally {
      setLoading(false);
    }
  }

  const handleModeToggle = (newMode) => {
    if (newMode === travelMode) return;
    setTravelMode(newMode);
    
    if (origin && destination) {
        handleSubmit(null, newMode);
    }
  };

  function handleStartNavigation() {
    if (routes.length > 0 && routes[activeRouteIndex]) {
      setIsWalking(true);
      setCurrentStep(0);
      setVisitedIndices(new Set()); 
      setReflections({});
	    setSheetOpen(false);
      walkStartTimeRef.current = Date.now();

      setIsZooming(true);

      if (map && userLocation) {
        const targetZoom = 18;
        map.flyTo(userLocation, targetZoom, {
          animate: true,
          duration: 1.0 
        });
        setTimeout(() => {
            setIsZooming(false);
            if (map) {
              const finalZoom = map.getZoom();
              if (handleZoomChange) {
                handleZoomChange(finalZoom);
              }
            }
        }, 2000);
      } else {
         setIsZooming(false);
      }
    }
  }

  const handleStopNavigation = () => {
    const endTime = Date.now();
    const startTime = walkStartTimeRef.current || endTime;
    const durationMs = endTime - startTime;
    const durationSeconds = Math.max(0, Math.round(durationMs / 1000));
    
    let distanceMeters = 0;
    const activeRoute = routes[activeRouteIndex];
    if (activeRoute && activeRoute.steps) {
        for (let i = 0; i < currentStep; i++) {
            distanceMeters += activeRoute.steps[i].distance || 0;
        }
    }
    const distanceKm = (distanceMeters / 1000).toFixed(2);
    hasSavedWalkRef.current = false;
    setFinalMetrics({
        distance: distanceKm,
        duration: durationSeconds,
        checkpoints: visitedIndices.size, 
        steps: Math.round(distanceMeters * 1.35),
        calories: Math.round(distanceKm * 65),
        start_coords: origin, 
        end_coords: destination    
    });
    setShowSummary(true);  
    setSheetOpen(false);
  };

  // Automatically save walk once metrics are available
  useEffect(() => {
    if (finalMetrics) {
      saveCompletedWalk();
    }
  }, [finalMetrics]);

  // Helper: build reflections payload and POST walk completion
  const saveCompletedWalk = async () => {
    if (hasSavedWalkRef.current || !finalMetrics) return;
    hasSavedWalkRef.current = true;

    try {
        const reflectionsData = [];
        
        Object.entries(reflections).forEach(([key, answersObj]) => {
             const idx = Number(key);
             const cpIndex = idx - 1; 
             const qSet = checkpoints[cpIndex]?.reflection_question;
             
             // Check for each answer part
             if (answersObj.a1) {
                reflectionsData.push({ question: qSet?.q1 || "Question 1", answer: answersObj.a1 });
             }
             if (answersObj.a2) {
                reflectionsData.push({ question: qSet?.q2 || "Question 2", answer: answersObj.a2 });
             }
             if (answersObj.a3) {
                reflectionsData.push({ question: qSet?.q3 || "Question 3", answer: answersObj.a3 });
             }
        });

        await fetch(`${apiBase}/api/walk_complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                distance_km: finalMetrics.distance,
                duration_seconds: finalMetrics.duration,
                checkpoints_completed: finalMetrics.checkpoints,
                start_coords: finalMetrics.start_coords, 
                end_coords: finalMetrics.end_coords,
                reflections_data: reflectionsData 
            }),
        });
        console.log("Walk & Reflections saved successfully!");
        await refreshData();
    } catch (e) {
        console.error("Save failed", e);
    }
  };

  // UPDATED: Save Logic to handle flattened list of 3 questions
  const handleSaveAndClose = async () => {
    await saveCompletedWalk();
    setShowSummary(false);
    setFinalMetrics(null);
    handleReset();
  };

  const handleOpenSaveRouteModal = async () => {
    const resolvedDestination = destination || finalMetrics?.end_coords || null;
    if (!resolvedDestination) {
      alert("Please select a destination before saving this route.");
      return;
    }

    let resolvedLabel = destinationLabel || "";
    if (!resolvedLabel) {
      try {
        resolvedLabel = await reverseGeocode(resolvedDestination.lat, resolvedDestination.lng);
        if (resolvedLabel) {
          setDestinationLabel(resolvedLabel);
        }
      } catch (e) {
        console.warn("[SavedRoutes Debug] Failed to auto-generate destination label", e);
      }
    }

    if (!resolvedLabel) {
      alert("Please select a destination with an address before saving this route.");
      return;
    }

    setSaveRouteDestinationLabel(resolvedLabel);
    setIsSaveRouteModalOpen(true);
  };

  // Save Route handler (shared with Library via localStorage)
  async function handleSaveRouteFromMap(routeData) {
    const resolvedDestination = destination || finalMetrics?.end_coords || null;
    if (!resolvedDestination) {
      alert("Please select a destination before saving this route.");
      return;
    }

    let resolvedLabel = destinationLabel || routeData.destinationLabel || "";
    if (!resolvedLabel) {
      try {
        resolvedLabel = await reverseGeocode(resolvedDestination.lat, resolvedDestination.lng);
        if (resolvedLabel) {
          setDestinationLabel(resolvedLabel);
        }
      } catch (e) {
        console.warn("[SavedRoutes Debug] Failed to auto-generate destination label", e);
      }
    }

    if (!resolvedLabel) {
      alert("Please select a destination with an address before saving this route.");
      return;
    }

    const payload = {
      name: routeData.name,
      note: routeData.note,
      destination: resolvedDestination,
      destinationLabel: resolvedLabel,
      routes: routes.length > 0 ? routes : [],
      activeRouteIndex: routes.length > 0 ? activeRouteIndex : 0,
      createdAt: routeData.createdAt,
    };
    console.log("[SavedRoutes Debug] POST /api/saved_routes payload (MapPage)", {
      destinationLabel: resolvedLabel,
      payload,
    });

    fetch(`${apiBase}/api/saved_routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((text) => {
            console.warn("[SavedRoutes Debug] POST /api/saved_routes failed (MapPage)", {
              status: res.status,
              body: text,
            });
            throw new Error("Failed to save route");
          });
        }
        return res.json();
      })
      .catch((e) => {
        console.error("[SavedRoutes Debug] Failed to save route from map:", e);
      })
      .finally(() => {
        setIsSaveRouteModalOpen(false);
      });
  }

  function handleReset() {
    localStorage.removeItem("activeWalkState");
    setOrigin(null);
    setIsOriginCurrentLocation(false);
    setDestination(null);
    setCheckpoints([]);
    setRoutes([]);
    setActiveRouteIndex(0);
    setOriginLabel("");
    setDestinationLabel("");
    setCheckpointPositions([]);
    setErrorMsg("");
    setSelectionStep("destination");
    setIsWalking(false);
    setVisitedIndices(new Set()); 
    setReflections({}); 
    setSheetOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setOriginQuery("");
    setOriginResults([]);
    setActiveRoutine(null);
    setShowRouteSelection(false); 
    setShowDirections(false); 
    setTravelMode("foot"); 

    if (map && userLocation) {
        map.flyTo(userLocation, 15, { animate: true });
    }
  }

  // UPDATED: Save the tempAnswers object to the reflections map
  const handleCompleteCheckpoint = () => {
    if (selectedCheckpoint) {
        setReflections(prev => ({
            ...prev,
            [selectedCheckpoint.index]: tempAnswers
        }));
    }
    setSelectedCheckpoint(null);
  };

  async function handleMapClick(latlng) {
    if (isWalking) return; 

    const { lat, lng } = latlng;
    if (selectionStep === "originOnMap") {
      setOrigin({ lat, lng });
      setIsOriginCurrentLocation(false); 
      const orgLabel = await reverseGeocode(lat, lng);
      setOriginLabel(orgLabel);
      setSelectionStep("done");
      setSheetOpen(true);
      return;
    }
    setDestination({ lat, lng });
    const destLabel = await reverseGeocode(lat, lng);
    setDestinationLabel(destLabel);
    setRoutes([]);
    setActiveRouteIndex(0);
    setCheckpoints([]);
    setCheckpointPositions([]);
    setErrorMsg("");
    if (origin) {
        setSelectionStep("done");
    } else {
        setSelectionStep("chooseOrigin");
    }
    setSheetOpen(true);
  }

  function handleSwapLocations() {
    const newOrigin = destination;
    const newDestination = origin;
    const newOriginLabel = destinationLabel;
    const newDestinationLabel = originLabel;
    
    setOrigin(newOrigin);
    setDestination(newDestination);
    setOriginLabel(newOriginLabel);
    setDestinationLabel(newDestinationLabel);
    
    setIsOriginCurrentLocation(false); 
    if (!newOrigin || !newDestination) {
        setRoutes([]);
        setActiveRouteIndex(0);
        setCheckpoints([]);
        setCheckpointPositions([]);
        setAllStreetNameMarkers([]);
    }
    setSelectionStep("done");
  }

  const activeRoute = routes[activeRouteIndex];
  
  // --- NEW: Smart Slider Logic ---
  const routeDistanceKm = activeRoute ? (activeRoute.distance / 1000) : 1;
  const recommendedCount = Math.max(1, Math.round(routeDistanceKm));
  const maxAllowed = Math.max(5, Math.ceil(routeDistanceKm * 3)); 
  // ------------------------------

  const sheetSummaryText = isWalking ? "Current Navigation" : "Plan your Yoga Walk";
  
  useEffect(() => {
    if (routes[activeRouteIndex] && routes[activeRouteIndex].steps) {
      const selectedRoute = routes[activeRouteIndex];
      const sampledPoints = sampleStreetNamePoints(selectedRoute.steps, 100);
      const pointsByStreet = {};
      sampledPoints.forEach(point => {
        if (!pointsByStreet[point.name]) {
          pointsByStreet[point.name] = [];
        }
        pointsByStreet[point.name].push(point);
      });
      const markers = Object.keys(pointsByStreet).map(streetName => {
        const points = pointsByStreet[streetName];
        const middleIndex = Math.floor(points.length / 2);
        const selectedPoint = points[middleIndex] || points[0];
        return {
          ...selectedPoint,
          streetName,
          key: `street-${selectedRoute.id}-${streetName}`
        };
      });
      setAllStreetNameMarkers(markers);
    } else {
      setAllStreetNameMarkers([]);
    }
  }, [routes[activeRouteIndex]?.id, routes[activeRouteIndex]?.steps]);

  return (
    <div className="mapPageRoot">
      {/* 1. MAP LAYER */}
      <div className="mapWrapper">
        {showSummary && finalMetrics && (
          <WalkSummaryCard
            distance={finalMetrics.distance}
            duration={finalMetrics.duration}
            checkpoints={finalMetrics.checkpoints}
            calories={finalMetrics.calories}
            onSave={handleOpenSaveRouteModal}
            onClose={() => {
              setShowSummary(false);
              handleReset();
            }}
          />
        )}

        {/* SAVE ROUTE MODAL (uses shared component + Library styles) */}
        <SaveRouteModal
          isOpen={isSaveRouteModalOpen}
          onClose={() => setIsSaveRouteModalOpen(false)}
          onSave={handleSaveRouteFromMap}
          destinationLabel={saveRouteDestinationLabel || destinationLabel}
        />

        <MapContainer
          ref={setMap}
          center={userLocation || defaultCenter}
          zoom={15}
          zoomSnap={0.1} 
          wheelPxPerZoomLevel={30} 
          zoomControl={!isWalking}
          className={isWalking ? "mapContainer mapContainer-walking" : "mapContainer"}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          <ClickHandler onClick={handleMapClick} />
          <MapViewTracker onZoomChange={handleZoomChange} />
          
          <UserLocationButton 
            userLocation={userLocation} 
            setHeading={setHeading} 
            isWalking={isWalking}
          />
          <VoiceToggleButton 
            voiceEnabled={voiceEnabled} 
            toggleVoice={() => setVoiceEnabled(!voiceEnabled)} 
            isWalking={isWalking}
          />
          <TravelModeButtons 
            travelMode={travelMode}
            onToggle={handleModeToggle}
            isWalking={isWalking}
          />

          {userLocation && (
            <Marker 
              position={userLocation} 
              icon={createLocationIcon(heading)} 
              zIndexOffset={1000} 
            />
          )}

          {origin && !isOriginCurrentLocation && <Marker position={origin} />}
          {destination && <Marker position={destination} />}

          {checkpointPositions.map((pos, idx) => (
            <Marker
              key={`cp-${idx}`}
              position={pos}
              icon={makeCheckpointIcon(idx + 1)}
              eventHandlers={{
                click: () => {
                  const cpData = checkpoints[idx];
                  if (cpData) {
                    setSelectedCheckpoint({ ...cpData, index: idx + 1 });
                  }
                },
              }}
            />
          ))}

          {!isWalking && routes.map((route, idx) => {
            const midPointIndex = Math.floor(route.coords.length / 2);
            const midPoint = route.coords[midPointIndex];
            if (!midPoint) return null;
            const isActive = idx === activeRouteIndex;
            const offset = LABEL_OFFSETS_METERS[idx % LABEL_OFFSETS_METERS.length];
            const labelPosition = offsetPoint(midPoint.lat, midPoint.lng, offset.north, offset.east);

            return (
              <Marker
                key={`time-pill-${route.id}`}
                position={labelPosition}
                icon={createDurationIcon(route.duration, isActive)}
                zIndexOffset={isActive ? 1000 : 500}
                eventHandlers={{
                  click: () => {
                    setActiveRouteIndex(idx);
                    const countToUse = activeRoutine ? activeRoutine.poses.length : Number(checkpointCount);
                    updateCheckpointPositionsForRoute(route, countToUse);
                  },
                }}
              />
            );
          })}

          {!isWalking && routes.map((route, idx) => {
            if (idx === activeRouteIndex) return null; 
            return (
              <Polyline
                key={route.id}
                positions={route.coords}
                pathOptions={{ 
                  className: "route-line routeLineAlt",
                  color: "#88a888", 
                  weight: 5,
                  opacity: 0.6 
                }}
                eventHandlers={{
                  click: () => {
                    setActiveRouteIndex(idx);
                    const countToUse = activeRoutine ? activeRoutine.poses.length : Number(checkpointCount);
                    updateCheckpointPositionsForRoute(route, countToUse);
                  },
                }}
              />
            );
          })}

          {routes[activeRouteIndex] && !isZooming && (
            <Polyline
              key={routes[activeRouteIndex].id}
              positions={routes[activeRouteIndex].coords}
              pathOptions={{ 
                className: "route-line routeLineActive",
                color: "#4d672a",   
                weight: 6,          
                opacity: 1.0        
              }}
            />
          )}

          {isWalking && showStreetNames && allStreetNameMarkers.map((point) => (
            <Marker
              key={point.key}
              position={point}
              icon={createStreetNameIcon(point.name, true)}
              zIndexOffset={800}
            />
          ))}
        </MapContainer>
      </div>

      {/* 2. SEARCH FOCUS OVERLAY (The Apple Maps View) */}
      <AnimatePresence>
        {activeSearchField && (
            <SearchFocusView
                type={activeSearchField}
                query={activeSearchField === 'origin' ? originQuery : searchQuery}
                onQueryChange={activeSearchField === 'origin' ? handleOriginSearch : handleSearchChange}
                results={activeSearchField === 'origin' ? originResults : searchResults}
                onSelect={activeSearchField === 'origin' ? selectOriginResult : selectSearchResult}
                onClose={() => setActiveSearchField(null)}
                isOrigin={activeSearchField === 'origin'}
                onUseLocation={handleUseMyLocation}
            />
        )}
      </AnimatePresence>

      {/* 3. ACTIVE NAV & CHECKPOINTS */}
      {((isWalking || showDirections) && activeRoute) && (
        <div className="activeNavOverlay">
          <div className="activeNavHeaderRow">
            <button 
              className="activeNavBackBtn"
              onClick={() => {
                if (isWalking) {
                  setIsWalking(false);
                  setSheetOpen(true);
                } else if (showDirections) {
                  setShowDirections(false);
                  setShowRouteSelection(true);
                  setSheetOpen(true); 
                }
              }}
            >
              ‹
            </button>
            {isWalking ? (
              <button 
                className="activeNavEndBtn"
                onClick={handleStopNavigation}
              >
                End
              </button>
            ) : (
              <button 
                className="activeNavEndBtn"
                onClick={() => {
                  setShowDirections(false);
                  setShowRouteSelection(true);
                  setSheetOpen(true); 
                }}
              >
                Change Route
              </button>
            )}
          </div>

          <div className="activeNavBody">
            {showDirections && !isWalking && activeRoute.steps && activeRoute.steps.length > 1 && (
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="nav-arrow-btn left"
              >
                ‹
              </button>
            )}
            <div className="activeNavMain">
              {activeRoute.steps?.[currentStep]?.instruction || activeRoute.steps?.[0]?.instruction || "Head towards destination"}
            </div>
            <div className="activeNavSub">
              <span>for</span>
              <strong>{formatDistance(activeRoute.steps?.[currentStep]?.distance || activeRoute.steps?.[0]?.distance)}</strong>
              {showDirections && !isWalking && activeRoute.steps && (
                <span className="step-counter">
                  ({currentStep + 1} of {activeRoute.steps.length})
                </span>
              )}
            </div>
            {showDirections && !isWalking && activeRoute.steps && activeRoute.steps.length > 1 && (
              <button
                onClick={() => setCurrentStep(Math.min(activeRoute.steps.length - 1, currentStep + 1))}
                disabled={currentStep >= activeRoute.steps.length - 1}
                className="nav-arrow-btn right"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}

      {selectedCheckpoint && (
        <div className="checkpoint-overlay-backdrop" onClick={() => setSelectedCheckpoint(null)}>
          <div className="checkpoint-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="cp-detail-header">
              <span className="cp-detail-badge">Checkpoint {selectedCheckpoint.index}</span>
              <button className="cp-close-btn" onClick={() => setSelectedCheckpoint(null)}>×</button>
            </div>
            
            <h2 className="cp-detail-title">
              {selectedCheckpoint.exercise?.name || "Yoga Pose"}
            </h2>

            <div 
              className="cp-slides-viewport" 
              ref={slidesRef} 
              onScroll={handleSlideScroll}
            >
              <div className="cp-slide">
                <div className="cp-detail-meta">
                  <span className="cp-meta-item">⏱ {selectedCheckpoint.exercise?.duration || "30 sec"}</span>
                  {selectedCheckpoint.exercise?.difficultyTag && (
                    <span className="cp-meta-item">🧘 {selectedCheckpoint.exercise.difficultyTag}</span>
                  )}
                </div>
                
                <div className="cp-gif-placeholder">
                  {selectedCheckpoint.exercise?.gif ? (
                    <img 
                      src={selectedCheckpoint.exercise.gif} 
                      alt={selectedCheckpoint.exercise.name} 
                      className="cp-gif-img" 
                      onError={(e) => { e.target.style.display = 'none'; }} 
                    />
                  ) : (
                    <div className="cp-gif-label">
                        <span className="cp-gif-emoji">🧘</span>
                        <p>No Animation</p>
                    </div>
                  )}
                </div>

                <p className="cp-detail-desc">
                  {selectedCheckpoint.exercise?.instructions 
                    ? selectedCheckpoint.exercise.instructions 
                    : "Stop and perform this pose. Take a deep breath and enjoy the surroundings!"}
                </p>
              </div>

              <div className="cp-slide">
                <h3 className="cp-benefits-title">Benefits</h3>
                <div className="cp-benefits-list">
                  {selectedCheckpoint.exercise?.benefits ? (
                    selectedCheckpoint.exercise.benefits.split(',').map((benefit, i) => {
                      const text = benefit.trim();
                      const formattedText = text.charAt(0).toUpperCase() + text.slice(1);
                      return (
                        <div key={i} className="cp-benefit-item">
                          <img src={TickIcon} alt="Check" className="cp-benefit-icon" />
                          {formattedText}
                        </div>
                      );
                    })
                  ) : (
                    <div className="cp-benefit-item">
                      <img src={TickIcon} alt="Check" className="cp-benefit-icon" />
                      Rejuvenates the mind and body.
                    </div>
                  )}
                </div>
              </div>

              {/* UPDATED: Slide 3 with STEP-BY-STEP logic */}
              <div className="cp-slide" style={{ overflowY: 'auto', paddingBottom: '20px' }}>
                <div className="cp-question-container">
                  <span className="cp-question-icon">🤔</span>
                  <h3 className="cp-benefits-title" style={{margin: 0}}>
                    Reflections ({questionStep}/3)
                  </h3>
                </div>
                
                {/* STEP 1: Question 1 */}
                {questionStep === 1 && (
                    <div className="cp-question-block" style={{marginBottom:'15px'}}>
                        <p className="cp-question-text" style={{fontSize:'14px', fontWeight:'600', marginBottom:'5px', color:'#125316'}}>
                            1. {selectedCheckpoint.reflection_question?.q1 || "Deep Reflection"}
                        </p>
                        <textarea 
                            className="cp-reflection-input"
                            style={{minHeight:'80px', fontSize:'14px', width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)'}}
                            placeholder="Your thoughts..."
                            value={tempAnswers.a1}
                            onChange={(e) => setTempAnswers({...tempAnswers, a1: e.target.value})}
                        />
                        <div style={{marginTop: '15px', textAlign: 'right'}}>
                            <button 
                              className="cp-complete-block-btn"
                              style={{width: 'auto', padding: '10px 20px', fontSize: '14px'}}
                              onClick={() => setQuestionStep(2)}
                            >
                              Next
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Question 2 */}
                {questionStep === 2 && (
                    <div className="cp-question-block" style={{marginBottom:'15px'}}>
                        <p className="cp-question-text" style={{fontSize:'14px', fontWeight:'600', marginBottom:'5px', color:'#125316'}}>
                            2. {selectedCheckpoint.reflection_question?.q2 || "Follow Up"}
                        </p>
                        <textarea 
                            className="cp-reflection-input"
                            style={{minHeight:'80px', fontSize:'14px', width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)'}}
                            placeholder="Dig deeper..."
                            value={tempAnswers.a2}
                            onChange={(e) => setTempAnswers({...tempAnswers, a2: e.target.value})}
                        />
                         <div style={{marginTop: '15px', display: 'flex', justifyContent: 'space-between'}}>
                             <button 
                                style={{background:'transparent', border:'none', color:'#666', fontWeight:'600'}}
                                onClick={() => setQuestionStep(1)}
                             >
                                Back
                             </button>
                            <button 
                              className="cp-complete-block-btn"
                              style={{width: 'auto', padding: '10px 20px', fontSize: '14px'}}
                              onClick={() => setQuestionStep(3)}
                            >
                              Next
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Question 3 */}
                {questionStep === 3 && (
                    <div className="cp-question-block" style={{marginBottom:'20px'}}>
                        <p className="cp-question-text" style={{fontSize:'14px', fontWeight:'600', marginBottom:'5px', color:'#125316'}}>
                            3. {selectedCheckpoint.reflection_question?.q3 || "Action"}
                        </p>
                        <textarea 
                            className="cp-reflection-input"
                            style={{minHeight:'80px', fontSize:'14px', width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)'}}
                            placeholder="Actionable step..."
                            value={tempAnswers.a3}
                            onChange={(e) => setTempAnswers({...tempAnswers, a3: e.target.value})}
                        />
                         <div style={{marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                             <button 
                                style={{background:'transparent', border:'none', color:'#666', fontWeight:'600'}}
                                onClick={() => setQuestionStep(2)}
                             >
                                Back
                             </button>
                            <button 
                              className="cp-complete-block-btn"
                              style={{width: 'auto', padding: '10px 20px', fontSize: '14px'}}
                              onClick={handleCompleteCheckpoint}
                            >
                              Save & Complete
                            </button>
                        </div>
                    </div>
                )}
              </div>
            </div>

            <div className="cp-pagination">
                {[0, 1, 2].map((i) => (
                    <div 
                        key={i}
                        className={`cp-dot ${activeSlide === i ? 'active' : ''} cp-pagination-dot`} 
                        onClick={() => scrollToSlide(i)}
                    />
                ))}
            </div>
          </div>
        </div>
      )}

      {isWalking && activeRoute && (
        <section className="walkMetricsSection">
          <div className="walkMetricsBar">
            <div className="walkMetric">
              <div className="walkMetricLabel">ETA</div>
              <div className="walkMetricValue">
                ~{Math.max(1, Math.round((activeRoute.duration || 0) / 60))} min
              </div>
            </div>
            <div className="walkMetric">
              <div className="walkMetricLabel">Time left</div>
              <div className="walkMetricValue">
                {Math.max(1, Math.round((activeRoute.duration || 0) / 60))} min
              </div>
            </div>
            <div className="walkMetric">
              <div className="walkMetricLabel">Distance</div>
              <div className="walkMetricValue">
                {formatDistance(activeRoute.distance || 0)}
              </div>
            </div>
          </div>
        </section>
      )}

      <section 
        className={`mapCheckpointSection ${(isWalking || showDirections) ? 'hidden' : ''}`}
      >
          <div
            className={
              "mapCheckpointSheet " +
              (sheetOpen
                ? "mapCheckpointSheetOpen"
                : "mapCheckpointSheetCollapsed")
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mapCheckpointSummaryBar"
              onClick={(e) => {
                 if(e.target.tagName !== 'INPUT' && !e.target.closest('.timeline-dropdown')) {
                     setSheetOpen(!sheetOpen); 
                 }
              }}
            >
              <span className="mapCheckpointSummaryText">{sheetSummaryText}</span>
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    fitMapToRoute();
                }}
                style={{
                    marginLeft: "10px",
                    background: "rgba(0,0,0,0.05)",
                    border: "none",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#555"
                }}
                title="Recenter Route"
              >
                ⟳
              </button>
            </div>

            <div className="mapCheckpointBody">
              <>
                {geoError && <p className="mapGeoErrorInline">{geoError}</p>}
                
                {/* LINEAR FLOW STEP 1: DESTINATION INPUTS (TRIGGERS)
                   Now these just open the focus view. No dropdowns here.
                */}
                {!showRouteSelection && !showDirections && (
                  <>
                    <div className="abstract-timeline">
                      <Reorder.Group 
                        axis="y" 
                        values={fieldOrder} 
                        onReorder={handleReorder} 
                        className="reorder-list"
                      >
                        {fieldOrder.map((item) => (
                          <DraggableItem key={item} value={item}>
                            {(dragControls) => (
                              <div className="location-row-abstract">
                                <div className="location-pill-abstract">
                                  {/* TRIGGER INPUT - READ ONLY */}
                                  <input 
                                    type="text" 
                                    className="timeline-input"
                                    placeholder={item === "origin" ? "Choose starting point" : "Where to?"}
                                    value={item === "origin" ? originQuery : searchQuery}
                                    readOnly 
                                    onClick={() => setActiveSearchField(item)} // Open Focus View
                                  />
                                  <GripIcon dragControls={dragControls} />
                                </div>
                              </div>
                            )}
                          </DraggableItem>
                        ))}
                      </Reorder.Group>
                    </div>

                    {/* Theme Selector - shown after origin/destination are selected */}
                    {origin && destination && (
                      <div className="theme-selector-container">
                        <label className="themeLabel">Theme</label>
                        <select
                          className="themeSelect"
                          value={selectedThemeId || ""}
                          onChange={(e) => setSelectedThemeId(e.target.value)}
                        >
                          <option value="">-- Random Mix --</option>
                          {themes.map(theme => (
                            <option key={theme.id} value={theme.id}>{theme.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* LINEAR FLOW STEP 2: ROUTE SELECTION + CHECKPOINT SLIDER */}
                {showRouteSelection && routes.length > 0 && (
                  <div className="route-selection-container">
                    <h3 className="route-selection-title">
                      Select a Route
                    </h3>
                    
                    <div 
                      className="routeChoices"
                      ref={routesContainerRef}
                      onMouseDown={startDragging}
                      onMouseLeave={stopDragging}
                      onMouseUp={stopDragging}
                      onMouseMove={onDragMove}
                    >
                      {routes.map((route, idx) => (
                        <button
                          key={route.id}
                          type="button"
                          className={"routeChoiceBtn" + (idx === activeRouteIndex ? " routeChoiceBtnActive" : "")}
                          onClick={() => {
                            setActiveRouteIndex(idx);
                            const distKm = route.distance / 1000;
                            const smartCount = Math.max(1, Math.round(distKm));
                            setCheckpointCount(smartCount); 
                            updateCheckpointPositionsForRoute(route, smartCount);
                          }}
                        >
                          <strong>Route {idx + 1}</strong> • {formatDuration(route.duration)} ({formatDistance(route.distance)})
                        </button>
                      ))}
                    </div>

                    <div className="checkpoint-control-abstract" style={{ marginTop: '20px' }}>
                        <div className="checkpoint-header">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <span className="checkpoint-label">
                                  {activeRoutine ? `🧘 ${activeRoutine.title}` : "🧘 Yoga Checkpoints"}
                                </span>
                                {!activeRoutine && checkpointCount === recommendedCount && (
                                    <span style={{ fontSize: '11px', color: '#4d672a', fontWeight: '700', marginTop: '2px' }}>
                                      ✨ Recommended
                                    </span>
                                )}
                            </div>
                            <span className="checkpoint-count-display">{checkpointCount}</span>
                        </div>
                        
                        {!activeRoutine ? (
                            <input
                                type="range"
                                min="1"
                                max={maxAllowed} 
                                step="1"
                                className="styled-slider"
                                value={checkpointCount}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setCheckpointCount(value);
                                    if (routes[activeRouteIndex]) {
                                        updateCheckpointPositionsForRoute(routes[activeRouteIndex], value);
                                    }
                                }}
                            />
                        ) : (
                            <p className="checkpoint-locked-text">
                               Checkpoints locked to routine.
                            </p>
                        )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="action-buttons-abstract">
                    {routes.length > 0 && !showRouteSelection && !showDirections ? (
                      <>
                        <button className="btn-abstract btn-primary" type="button" onClick={handleStartNavigation}>Start Walk</button>
                        <button className="btn-abstract btn-secondary" type="submit" disabled={loading}>{loading ? "..." : "Refresh"}</button>
                      </>
                    ) : routes.length > 0 && showRouteSelection ? (
                      <>
                        <button
                          className="btn-abstract btn-primary"
                          type="button"
                          onClick={() => {
                            setShowRouteSelection(false);
                            setSheetOpen(false); 
                            handleStartNavigation(); 
                          }}
                        >
                          Go
                        </button>
                        <button className="btn-abstract btn-secondary" type="submit" disabled={loading}>
                          {loading ? "..." : "Refresh"}
                        </button>
                      </>
                    ) : routes.length > 0 && showDirections ? (
                      <>
                        <button className="btn-abstract btn-primary" type="button" onClick={handleStartNavigation}>
                          Start Walk
                        </button>
                        <button
                          className="btn-abstract btn-secondary"
                          type="button"
                          onClick={() => {
                            setShowDirections(false);
                            setShowRouteSelection(true);
                          }}
                        >
                          Change Route
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn-abstract btn-primary" type="submit" disabled={loading}>{loading?"Finding...":"Find Routes"}</button>
                        <button className="btn-abstract btn-secondary" type="button" onClick={handleReset}>Clear</button>
                      </>
                    )}
                  </div>
                </form>
                {errorMsg && <p className="mapErrorInline">{errorMsg}</p>}
              </>
          </div>
        </div>
      </section>
    </div>
  );
}