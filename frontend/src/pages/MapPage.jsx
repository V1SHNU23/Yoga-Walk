import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom"; 
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { Reorder, useDragControls } from "motion/react";

// --- Icons ---
import UserLocationIcon from "../icons/User-Location.svg"; 
import UserLocationFillIcon from "../icons/User-Location-Fill.svg"; 
import TickIcon from "../icons/tick.svg"; 
import VolumeIcon from "../icons/volume.svg";
import MuteIcon from "../icons/mute.svg";

import WalkSummaryCard from "../components/WalkSummaryCard";

// --- CONFIG ---
const defaultCenter = {
  lat: -33.8688, // fallback Sydney
  lng: 151.2093,
};

const WALK_SPEED_KMH = 5;
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

// Predefined offsets to fan out route duration labels so they don't stack
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

// Sample points along route segments for street name display
// This ensures street names appear throughout long segments, not just at maneuver points
function sampleStreetNamePoints(steps, intervalMeters = 100) {
  const streetPoints = [];
  
  if (!steps || steps.length === 0) return streetPoints;
  
  steps.forEach((step, stepIdx) => {
    // Skip if no street name or geometry
    if (!step.name || !step.geometry || step.geometry.length < 2 || step.name.trim() === '' || step.name === 'road') {
      return;
    }
    
    const geometry = step.geometry;
    
    // Calculate cumulative distances along this step's geometry
    const cumDist = [0];
    for (let i = 1; i < geometry.length; i++) {
      const d = distanceMeters(geometry[i - 1], geometry[i]);
      cumDist.push(cumDist[i - 1] + d);
    }
    
    const totalDist = cumDist[cumDist.length - 1];
    if (totalDist === 0) return;
    
    // Sample points at regular intervals along this segment
    const numSamples = Math.max(1, Math.floor(totalDist / intervalMeters));
    const sampleStep = totalDist / (numSamples + 1);
    
    for (let k = 1; k <= numSamples; k++) {
      const targetDist = sampleStep * k;
      
      // Find which segment of the geometry this distance falls on
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

// --- ROUTE SELECTION HELPERS ---

function getRouteMidpoint(route) {
  if (!route || !route.coords || route.coords.length === 0) return null;
  const midIndex = Math.floor(route.coords.length / 2);
  return route.coords[midIndex];
}

// Keep at most "maxRoutes" routes that are distinct in both distance and path
function selectDistinctTopRoutes(routes, maxRoutes = 3) {
  if (!routes || routes.length === 0) return [];

  // Sort by duration (shortest first)
  const sorted = [...routes].sort((a, b) => (a.duration || 0) - (b.duration || 0));

  const picked = [];
  const DISTANCE_DIFF_FRACTION = 0.1; // 10% difference
  const MIDPOINT_PROX_THRESHOLD = 80; // meters

  for (const route of sorted) {
    if (picked.length >= maxRoutes) break;

    const midA = getRouteMidpoint(route);
    const distA = route.distance || 0;

    let isSimilar = false;
    for (const chosen of picked) {
      const midB = getRouteMidpoint(chosen);
      const distB = chosen.distance || 0;

      const fracDiff =
        Math.abs(distA - distB) / Math.max(distA, distB, 1);

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

  // Fallback: if we filtered too aggressively, ensure at least one
  if (picked.length === 0) {
    picked.push(sorted[0]);
  }

  return picked;
}

// --- HELPER COMPONENTS ---

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

// Component to track map view - only updates zoom for street name visibility
function MapViewTracker({ onZoomChange }) {
  const map = useMap();
  const lastZoomRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  
  useEffect(() => {
    const updateZoom = () => {
      const zoom = map.getZoom();
      
      // Debounce updates to prevent rapid toggling
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        // Only update if zoom changed significantly (prevents rapid toggling)
        if (lastZoomRef.current === null || Math.abs(zoom - lastZoomRef.current) > 0.1) {
          lastZoomRef.current = zoom;
          onZoomChange(zoom);
        }
      }, 100);
    };
    
    // Initial update
    const initialZoom = map.getZoom();
    lastZoomRef.current = initialZoom;
    onZoomChange(initialZoom);
    
    // Only listen to zoomend (not during zoom) to prevent rapid updates
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
  
  const [map, setMap] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [checkpointCount, setCheckpointCount] = useState(5);

  const [checkpoints, setCheckpoints] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);

  // --- ROUTINE & THEME STATE ---
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [themes, setThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState("");

  // Active Walk State
  const [isWalking, setIsWalking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Overlay State (Checkpoint Details)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [visitedIndices, setVisitedIndices] = useState(new Set()); 

  // --- NEW: REFLECTION STATE ---
  // Stores all answers: { 1: "felt good", 2: "hard" }
  const [reflections, setReflections] = useState({}); 
  // Stores current typing for the active slide
  const [tempReflection, setTempReflection] = useState(""); 
  
  // --- SWIPEABLE CARD STATE ---
  const [activeSlide, setActiveSlide] = useState(0); 
  const slidesRef = useRef(null); 
  const [isZooming, setIsZooming] = useState(false);
  const isMounted = useRef(false);

  // State to track if street names should be shown (with hysteresis to prevent flickering)
  const [showStreetNames, setShowStreetNames] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Pre-calculated street name markers (calculated once when route is selected)
  const [allStreetNameMarkers, setAllStreetNameMarkers] = useState([]);
  
  // Hysteresis thresholds: show at 16.5, hide at 15.5 (prevents flickering)
  const ZOOM_SHOW_THRESHOLD = 16.5;
  const ZOOM_HIDE_THRESHOLD = 15.5;
  
  // Track zoom level with ref to avoid state updates
  const currentZoomRef = useRef(13);
  const isWalkingRef = useRef(isWalking);
  const showStreetNamesRef = useRef(false);
  
  // Keep refs in sync with state
  useEffect(() => {
    isWalkingRef.current = isWalking;
    if (!isWalking) {
      showStreetNamesRef.current = false;
      setShowStreetNames(false);
    }
  }, [isWalking]);
  

  // Update street name visibility based on zoom with hysteresis and smooth transitions
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
    
    // Use hysteresis: show at 16.5, hide at 15.5
    // This prevents rapid toggling when zoom is between thresholds
    if (showStreetNamesRef.current) {
      // Currently showing - only hide if zoomed out below hide threshold
      if (zoom < ZOOM_HIDE_THRESHOLD) {
        showStreetNamesRef.current = false;
        setShowStreetNames(false);
      }
    } else {
      // Currently hidden - only show if zoomed in above show threshold
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [originQuery, setOriginQuery] = useState("");
  const [originResults, setOriginResults] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

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

  // --- VOICE GUIDANCE STATE ---
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const voiceEnabledRef = useRef(voiceEnabled);

  // API Base URL - Use environment variable or fallback to localhost
  // For mobile testing, set VITE_API_URL=http://YOUR_IP:5000 in .env.local
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const lastStepChangeRef = useRef(Date.now());
  const searchTimeoutRef = useRef(null);

  const walkStartTimeRef = useRef(null);

  // --- 1. FETCH REFLECTION THEMES ON MOUNT ---
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

  // --- 2. INITIALIZE FROM ROUTINE (if passed) ---
  useEffect(() => {
    if (location.state && location.state.routine) {
        const routine = location.state.routine;
        setActiveRoutine(routine);
        setCheckpointCount(routine.poses.length);
        setRoutes([]);
        setCheckpoints([]);
    }
  }, [location.state]);

  // Keep ref in sync
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

  // --- UPDATED: HANDLE CHECKPOINT OPEN ---
  useEffect(() => {
    if (selectedCheckpoint) {
      setActiveSlide(0);
      // RESET TEMP REFLECTION TO EXISTING SAVED TEXT (IF ANY)
      setTempReflection(reflections[selectedCheckpoint.index] || "");

      if (slidesRef.current) {
        slidesRef.current.scrollTo({ left: 0, behavior: 'auto' });
      }
    }
  }, [selectedCheckpoint]); // note: we don't depend on 'reflections' to avoid loops

  useEffect(() => {
    if (destinationLabel && !showDropdown) {
      setSearchQuery(destinationLabel);
    }
  }, [destinationLabel, showDropdown]);

  useEffect(() => {
    if (originLabel && !showOriginDropdown) {
      setOriginQuery(originLabel);
    }
  }, [originLabel, showOriginDropdown]);

  // --- RESTORE/SAVE STATE LOGIC ---
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
            // NEW: Restore reflections
            if (parsed.reflections) setReflections(parsed.reflections);
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
            reflections // NEW: Save reflections
        };
        localStorage.setItem("activeWalkState", JSON.stringify(stateToSave));
    } else {
        localStorage.removeItem("activeWalkState");
    }
  }, [origin, destination, routes, checkpoints, checkpointPositions, isWalking, currentStep, activeRouteIndex, visitedIndices, selectionStep, sheetOpen, originLabel, destinationLabel, voiceEnabled, reflections]);

  // --- SLIDE SCROLL HANDLER ---
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

  // --- DRAG SCROLL HANDLERS ---
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

  // --- REORDER HANDLER ---
  const handleReorder = (newOrder) => {
    setFieldOrder(newOrder);
    if (newOrder[0] !== fieldOrder[0]) {
      handleSwapLocations();
      setTimeout(() => {
        setFieldOrder(["origin", "destination"]);
      }, 300);
    }
  };

  // --- SEARCH LOGIC ---
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
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
            setShowDropdown(true);
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
    setShowDropdown(false);
    setSelectionStep("done");
    setSheetOpen(true);
  };

  const handleOriginSearch = (e) => {
    const query = e.target.value;
    setOriginQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setOriginResults([]);
      setShowOriginDropdown(false);
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
        setShowOriginDropdown(true);
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
    setShowOriginDropdown(false);
    setIsOriginCurrentLocation(false);
  };

  // --- LOCATION & COMPASS LOGIC ---
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
        setGeoError(""); // Clear any previous errors
      },
      handleLocationError,
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newLoc = { lat: latitude, lng: longitude };
        setUserLocation(newLoc);
        setGeoError(""); // Clear errors on success
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

  // 1.5 Determine Country Code
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

  // 2. Automatic Navigation Hook
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

  // --- VOICE GUIDANCE HOOK FOR STEPS ---
  useEffect(() => {
    if (isWalking && routes[activeRouteIndex]) {
        const currentInstruction = routes[activeRouteIndex].steps?.[currentStep]?.instruction;
        if (currentInstruction) {
            speak(currentInstruction);
        }
    }
  }, [currentStep, isWalking, activeRouteIndex, routes]);

  // 3. Checkpoint Arrival Hook
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

  // 4. Auto-Finish Hook
  useEffect(() => {
    if (!isWalking || !userLocation || !destination) return;
    
    const distToEnd = distanceMeters(userLocation, destination);
    
    if (distToEnd < 30) {
       handleStopNavigation();
    }
  }, [userLocation, destination, isWalking]);

  useEffect(() => {
    if (map && userLocation && !hasCenteredOnLoad) {
      map.setView(userLocation, 15, { animate: false }); // Instant set
      setHasCenteredOnLoad(true);
    }
  }, [map, userLocation, hasCenteredOnLoad]);

  // --- LOGIC FUNCTIONS ---

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
    setShowOriginDropdown(false);

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

  async function fetchSingleRoute(pointList) {
    const coordString = pointList.map((p) => `${p.lng},${p.lat}`).join(";");
    
    const url = `https://router.project-osrm.org/route/v1/foot/${coordString}?overview=full&geometries=geojson&steps=true&alternatives=true`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not get route");

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) throw new Error("No route found");

    return data.routes.map(route => {
        const coords = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
        const distance = route.distance;
        
        const walkDurationSeconds = (distance * 3.6) / WALK_SPEED_KMH;

        const steps = route.legs[0].steps.map(step => {
          // Extract geometry coordinates for this step
          const stepGeometry = step.geometry?.coordinates || [];
          const stepCoords = stepGeometry.map(([lng, lat]) => ({ lat, lng }));
          
          return {
            instruction: step.maneuver.type === 'depart' 
              ? `Head ${step.maneuver.modifier || 'forward'} on ${step.name || 'road'}`
              : `${step.maneuver.type} ${step.maneuver.modifier || ''} ${step.name ? 'on ' + step.name : ''}`,
            distance: step.distance,
            maneuver: step.maneuver,
            name: step.name,
            location: step.maneuver.location ? {
              lat: step.maneuver.location[1],
              lng: step.maneuver.location[0]
            } : null,
            geometry: stepCoords // Store full geometry for sampling
          };
        });

        return { coords, distance, duration: walkDurationSeconds, steps };
    });
  }

  async function fetchRoutes(originPoint, destinationPoint) {
    const routesList = [];
    const timestamp = Date.now(); 
    let idCounter = 0;

    try {
      const directs = await fetchSingleRoute([originPoint, destinationPoint]);
      
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
        const viaRoutes = await fetchSingleRoute([originPoint, via, destinationPoint]);
        viaRoutes.forEach(route => {
             routesList.push({ id: `${timestamp}-${idCounter++}`, ...route });
        });
      } catch (e) {}
    }

    if (!routesList.length) throw new Error("No route found");

    return selectDistinctTopRoutes(routesList, 3);
  }

  // --- HANDLER: GENERATE JOURNEY ---
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!origin || !destination) {
      if (!origin && originQuery.length > 0) {
        setErrorMsg("Please select a starting point from the dropdown list.");
      } else if (!destination && searchQuery.length > 0) {
        setErrorMsg("Please select a destination from the dropdown list.");
      } else {
        setErrorMsg("Please choose destination and starting point.");
      }
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const routeOptions = await fetchRoutes(origin, destination);
      setRoutes(routeOptions);
      setActiveRouteIndex(0);
      setShowRouteSelection(true); // Show route selection UI
      setShowDirections(false); // Ensure we start at route selection

      const selectedRoute = routeOptions[0];
      
      const countToUse = activeRoutine ? activeRoutine.poses.length : Number(checkpointCount);
      updateCheckpointPositionsForRoute(selectedRoute, countToUse);

      const payload = {
        origin,
        destination,
        checkpoint_count: countToUse,
      };

      // 1. Fetch Route & Poses
      const res = await fetch(`${apiBase}/api/journey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        let finalCheckpoints = data.checkpoints || [];

        // 2. OVERRIDE POSES (Routine)
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
                        gif: routinePose.image 
                    }
                };
            });
        }

        // 3. MERGE REFLECTION QUESTIONS (Theme)
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
        
        setCheckpoints(finalCheckpoints);
      }
      
      setVisitedIndices(new Set()); 
      setReflections({}); // Clear old reflections for new journey
      
      // Pre-calculate all street name markers for the selected route
      if (routeOptions[0] && routeOptions[0].steps) {
        const sampledPoints = sampleStreetNamePoints(routeOptions[0].steps, 100);
        
        // Group points by street name and select one point per street
        const pointsByStreet = {};
        sampledPoints.forEach(point => {
          if (!pointsByStreet[point.name]) {
            pointsByStreet[point.name] = [];
          }
          pointsByStreet[point.name].push(point);
        });
        
        // For each street name, select a representative point (use the middle one for stability)
        const markers = Object.keys(pointsByStreet).map(streetName => {
          const points = pointsByStreet[streetName];
          // Use the middle point of each street segment for better visibility
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
      
     
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (map && routeOptions.length > 0 && origin && destination) {
            // Calculate distance between origin and destination
            const journeyDistance = distanceMeters(origin, destination);
            
            let calculatedZoom;
            if (journeyDistance < 1000) {
              // Very short (< 1km): zoom level 15-16
              calculatedZoom = 16 - (journeyDistance / 1000) * 1;
            } else if (journeyDistance < 5000) {
              // Short (1-5km): zoom level 13-15
              calculatedZoom = 15 - ((journeyDistance - 1000) / 4000) * 2;
            } else if (journeyDistance < 15000) {
              // Medium (5-15km): zoom level 11-13
              calculatedZoom = 13 - ((journeyDistance - 5000) / 10000) * 2;
            } else {
              // Long (> 15km): zoom level 9-11
              calculatedZoom = Math.max(9, 11 - ((journeyDistance - 15000) / 10000) * 1);
            }
            
            // Clamp zoom to reasonable bounds
            calculatedZoom = Math.max(9, Math.min(16, calculatedZoom));
            
            // Collect all coordinates from all routes for bounds calculation
            const allCoords = [];
            routeOptions.forEach(route => {
              if (route.coords && route.coords.length > 0) {
                allCoords.push(...route.coords);
              }
            });
            allCoords.push(origin, destination);
            
            if (allCoords.length > 0) {
              // Create bounds from all coordinates
              const bounds = L.latLngBounds(allCoords);
              
              // Get actual dimensions dynamically to adapt to different devices
              const viewportHeight = window.innerHeight;
              const viewportWidth = window.innerWidth;
              
              // Get the actual map container to determine available space
              const mapContainer = map.getContainer();
              const mapContainerHeight = mapContainer ? mapContainer.clientHeight : viewportHeight;
              
              // Get the actual card height dynamically
              const sheetElement = document.querySelector('.mapCheckpointSheet');
              let cardHeight = 0;
              if (sheetElement) {
                cardHeight = sheetElement.offsetHeight || sheetElement.clientHeight || 0;
              }
              
              // Calculate nav bar height: difference between viewport and map container
              // This accounts for any nav bar, status bar, or other UI elements
              const navBarHeight = viewportHeight - mapContainerHeight;
              
              // Calculate visible map area: map container - card
              // The card overlays the map, so visible area is map container minus card
              const visibleMapHeight = mapContainerHeight - cardHeight;
              
              // Calculate top padding dynamically based on viewport
              // Map controls (zoom, location buttons) typically take ~6-10% of viewport height
              const topPadding = Math.max(60, viewportHeight * 0.08); // Minimum 60px, or 8% of viewport
              
              // Bottom padding: card height to account for the card overlay
              const bottomPadding = cardHeight;
              
              // Use large horizontal padding to position origin on left side and destination on right side
              const horizontalPadding = Math.max(viewportWidth * 0.3, 150); // 30% of viewport width, minimum 150px
              
              // Use fitBounds with padding that accounts for card to center journey in visible map area
              map.fitBounds(bounds, {
                padding: [topPadding, horizontalPadding, bottomPadding, horizontalPadding], // [top, right, bottom, left]
                maxZoom: calculatedZoom, // Zoom level based on journey distance
                animate: true,
                duration: 1.0
              });
            }
          }
        });
      });

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to find route");
    } finally {
      setLoading(false);
    }
  }

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
          duration: 2.0 
        });
        
        // Check zoom level after animation completes to show street names
        setTimeout(() => {
            setIsZooming(false);
            // Trigger zoom check after zoom animation
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

  const handleSaveAndClose = async () => {
    try {
        const reflectionsData = Object.entries(reflections).map(([key, answer]) => {
             const idx = Number(key); // Checkpoint Index (1-based)
             const cpIndex = idx - 1; // Array Index (0-based)
             const question = checkpoints[cpIndex]?.reflection_question || "Reflection";
             return { question, answer };
        });

        // 2. Send to Backend
        await fetch(`${apiBase}/api/walk_complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                distance_km: finalMetrics.distance,
                duration_seconds: finalMetrics.duration,
                checkpoints_completed: finalMetrics.checkpoints,
                start_coords: finalMetrics.start_coords, 
                end_coords: finalMetrics.end_coords,
                
                // --- NEW FIELD ---
                reflections_data: reflectionsData 
            }),
        });
        console.log("Walk & Reflections saved successfully!");
    } catch (e) {
        console.error("Save failed", e);
    }

    setShowSummary(false);
    setFinalMetrics(null);
    handleReset();
  };

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
    setReflections({}); // Clear reflections
    setSheetOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setOriginQuery("");
    setOriginResults([]);
    setActiveRoutine(null);
    setShowRouteSelection(false); // Clear route selection state
    setShowDirections(false); // Clear directions state

    if (map && userLocation) {
        map.flyTo(userLocation, 15, { animate: true });
    }
  }

  // --- NEW: COMPLETE CHECKPOINT HANDLER ---
  const handleCompleteCheckpoint = () => {
    if (selectedCheckpoint) {
        // SAVE USER INPUT TO STATE (Keyed by Checkpoint Index)
        setReflections(prev => ({
            ...prev,
            [selectedCheckpoint.index]: tempReflection
        }));
    }
    setSelectedCheckpoint(null);
  };

  // --- EVENT HANDLERS ---
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

  // --- RENDER HELPERS ---
  const activeRoute = routes[activeRouteIndex];
  const sheetSummaryText = isWalking ? "Current Navigation" : "Plan your Yoga Walk";
  
  // Update street name markers when active route changes
  useEffect(() => {
    if (routes[activeRouteIndex] && routes[activeRouteIndex].steps) {
      const selectedRoute = routes[activeRouteIndex];
      const sampledPoints = sampleStreetNamePoints(selectedRoute.steps, 100);
      
      // Group points by street name and select one point per street
      const pointsByStreet = {};
      sampledPoints.forEach(point => {
        if (!pointsByStreet[point.name]) {
          pointsByStreet[point.name] = [];
        }
        pointsByStreet[point.name].push(point);
      });
      
      // For each street name, select a representative point (use the middle one for stability)
      const markers = Object.keys(pointsByStreet).map(streetName => {
        const points = pointsByStreet[streetName];
        // Use the middle point of each street segment for better visibility
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
      <div className="mapWrapper">
        
        {/* --- SUMMARY CARD OVERLAY --- */}
        {showSummary && finalMetrics && (
            <WalkSummaryCard
                distance={finalMetrics.distance}
                duration={finalMetrics.duration}
                checkpoints={finalMetrics.checkpoints}
                calories={finalMetrics.calories}
                onSave={handleSaveAndClose}
                onClose={() => {
                setShowSummary(false);
                handleReset();
                }}
            />
        )}

        <MapContainer
          ref={setMap}
          center={userLocation || defaultCenter}
          zoom={13}
          zoomControl={!isWalking}
          className={isWalking ? "mapContainer mapContainer-walking" : "mapContainer"}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          <ClickHandler onClick={handleMapClick} />
          
          {/* Map View Tracker - Updates view state for street name filtering */}
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

          {/* DYNAMIC USER LOCATION PUCK */}
          {userLocation && (
            <Marker 
              position={userLocation} 
              icon={createLocationIcon(heading)} 
              zIndexOffset={1000} 
            />
          )}

          {/* SHOW ORIGIN MARKER (ONLY IF NOT CURRENT LOCATION) */}
          {origin && !isOriginCurrentLocation && <Marker position={origin} />}
          
          {destination && <Marker position={destination} />}

          {/* CHECKPOINT MARKERS */}
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

          {/* TIME PILLS ON MAP (Hide when walking) */}
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

          {/* ROUTES (Hide inactive routes when walking) */}
          {!isWalking && routes.map((route, idx) => {
            if (idx === activeRouteIndex) return null; // Skip active for now

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

          {/* Render ACTIVE route last */}
          {routes[activeRouteIndex] && !isZooming && (
            <Polyline
              key={routes[activeRouteIndex].id}
              positions={routes[activeRouteIndex].coords}
              pathOptions={{ 
                className: "route-line routeLineActive",
                color: "#61b329",   
                weight: 6,          
                opacity: 1.0        
              }}
            />
          )}

          {/* Street Name Labels - Show only when zoomed in (pre-calculated, smooth transitions) */}
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

      {/* --- TOP NAVIGATION POPUP WHEN WALKING OR VIEWING DIRECTIONS --- */}
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
                  setSheetOpen(true); // Show bottom sheet again
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
                  setSheetOpen(true); // Show bottom sheet again
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

      {/* --- SWIPEABLE CHECKPOINT DETAIL OVERLAY --- */}
      {selectedCheckpoint && (
        <div className="checkpoint-overlay-backdrop" onClick={() => setSelectedCheckpoint(null)}>
          <div className="checkpoint-detail-card" onClick={(e) => e.stopPropagation()}>
            
            {/* HEADER */}
            <div className="cp-detail-header">
              <span className="cp-detail-badge">Checkpoint {selectedCheckpoint.index}</span>
              <button className="cp-close-btn" onClick={() => setSelectedCheckpoint(null)}>×</button>
            </div>
            
            <h2 className="cp-detail-title">
              {selectedCheckpoint.exercise?.name || "Yoga Pose"}
            </h2>

            {/* --- SCROLLABLE CONTENT AREA --- */}
            <div 
              className="cp-slides-viewport" 
              ref={slidesRef} 
              onScroll={handleSlideScroll}
            >
              {/* SLIDE 1: OVERVIEW & INSTRUCTIONS */}
              <div className="cp-slide">
                <div className="cp-detail-meta">
                  <span className="cp-meta-item">⏱ {selectedCheckpoint.exercise?.duration || "30 sec"}</span>
                  <span className="cp-meta-item">🧘 Beginner Friendly</span>
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

              {/* SLIDE 2: BENEFITS FROM DB */}
              <div className="cp-slide">
                <h3 className="cp-benefits-title">Benefits</h3>
                
                <div className="cp-benefits-list">
                  {selectedCheckpoint.exercise?.benefits ? (
                    selectedCheckpoint.exercise.benefits.split(',').map((benefit, i) => {
                      const text = benefit.trim();
                      const formattedText = text.charAt(0).toUpperCase() + text.slice(1);

                      return (
                        <div key={i} className="cp-benefit-item">
                          <img 
                            src={TickIcon} 
                            alt="Check" 
                            className="cp-benefit-icon" 
                          />
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

              {/* SLIDE 3: REFLECTION (UPDATED) */}
              <div className="cp-slide">
                <div className="cp-question-container">
                  <span className="cp-question-icon">🤔</span>
                  <p className="cp-question-text">
                     {selectedCheckpoint.reflection_question || "How did your body feel while holding this pose?"}
                  </p>
                </div>
                
                {/* --- NEW TEXT AREA --- */}
                <textarea 
                    className="cp-reflection-input cp-reflection-textarea"
                    placeholder="Type your thoughts here..."
                    value={tempReflection}
                    onChange={(e) => setTempReflection(e.target.value)}
                />

                <button 
                  className="cp-complete-block-btn"
                  onClick={handleCompleteCheckpoint}
                >
                  Complete Checkpoint
                </button>
              </div>
            </div>

            {/* PAGINATION DOTS */}
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

      {/* --- FOOTER: WALK METRICS OR PLANNING SHEET --- */}
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
            </div>

            <div className="mapCheckpointBody">
              {/* 2. PLANNING UI */}
              <>
                {geoError && <p className="mapGeoErrorInline">{geoError}</p>}
                
                {/* --- 1. START/END INPUTS (Draggable Timeline) - Hidden during route selection & directions --- */}
                {!showRouteSelection && !showDirections && (
                  <div className="abstract-timeline">
                      
                      {/* DRAGGABLE LIST */}
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
                                  <input 
                                    type="text" 
                                    className="timeline-input"
                                    placeholder={item === "origin" ? "Choose starting point" : "Where to?"}
                                    value={item === "origin" ? originQuery : searchQuery}
                                    onChange={item === "origin" ? handleOriginSearch : handleSearchChange}
                                    onFocus={() => item === "origin" ? setShowOriginDropdown(true) : setShowDropdown(true)}
                                    onBlur={() => setTimeout(() => item === "origin" ? setShowOriginDropdown(false) : setShowDropdown(false), 200)}
                                  />
                                  {/* Grip Handle */}
                                  <GripIcon dragControls={dragControls} />
                                  
                                  {/* DROPDOWNS */}
                                  {item === "origin" && showOriginDropdown && (
                                    <div className="timeline-dropdown">
                                      <div className="dropdown-option-special" onClick={handleUseMyLocation}>
                                        <span>⌖</span> Use my current location
                                      </div>
                                      {originResults.map((result, idx) => (
                                        <div key={idx} className="dropdown-option" onClick={() => selectOriginResult(result)}>
                                          <span className="dropdown-main-text">{result.address.road || result.display_name.split(",")[0]}</span>
                                          <span className="dropdown-sub-text">{result.display_name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {item === "destination" && showDropdown && (
                                    <div className="timeline-dropdown">
                                      {searchResults.map((result, idx) => (
                                        <div key={idx} className="dropdown-option" onClick={() => selectSearchResult(result)}>
                                          <span className="dropdown-main-text">{result.address.road || result.display_name.split(",")[0]}</span>
                                          <span className="dropdown-sub-text">{result.display_name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </DraggableItem>
                        ))}
                      </Reorder.Group>
                  </div>
                )}

                {/* --- 2. ROUTE SELECTION (Separate step - shown first after finding routes) --- */}
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
                            const countToUse = activeRoutine ? activeRoutine.poses.length : Number(checkpointCount);
                            updateCheckpointPositionsForRoute(route, countToUse);
                          }}
                        >
                          {/* DURATION TEXT */}
                          <strong>Route {idx + 1}</strong> • {formatDuration(route.duration)} ({formatDistance(route.distance)})
                        </button>
                      ))}
                    </div>
                  </div>
                )}


                {/* --- 4. CHECKPOINTS & THEME SELECTOR (Hidden during route selection) --- */}
                {!showRouteSelection && (
                  <div className="checkpoint-control-abstract">
                      <div className="checkpoint-header">
                          <span className="checkpoint-label">
                             {activeRoutine ? `🧘 ${activeRoutine.title}` : "🧘 Yoga Checkpoints"}
                          </span>
                          <span className="checkpoint-count-display">{checkpointCount}</span>
                      </div>
                      
                      {!activeRoutine ? (
                          <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              className="styled-slider"
                              value={checkpointCount}
                              onChange={(e) => {
                                  const value = Number(e.target.value);
                                  setCheckpointCount(value);
                                  if (routes[activeRouteIndex]) {
                                      updateCheckpointPositionsForRoute(routes[activeRouteIndex], value);
                                  } else {
                                      setCheckpointPositions([]);
                                  }
                              }}
                          />
                      ) : (
                          <p className="checkpoint-locked-text">
                             Checkpoints locked to routine.
                          </p>
                      )}

                      {!activeRoutine && (
                          <div className="checkpoint-range-labels">
                              <span>1</span>
                              <span>10</span>
                          </div>
                      )}

                      {/* --- NEW: REFLECTION THEME SELECTOR --- */}
                      <div className="theme-selector">
                        <label className="theme-selector-label">
                          🧠 Reflection Theme
                        </label>
                        <select 
                          value={selectedThemeId || ""} 
                          onChange={(e) => setSelectedThemeId(e.target.value)}
                          className="theme-selector-select"
                        >
                          <option value="">-- Random Mix --</option>
                          {themes.map(t => (
                              <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      </div>

                  </div>
                )}

                {/* --- 5. ROUTES (Shown on planning screen, hidden in selection & directions) --- */}
                {!showRouteSelection && !showDirections && routes.length > 1 && (
                  <div className="routes-container-spacing">
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
                            updateCheckpointPositionsForRoute(route, Number(checkpointCount));
                          }}
                        >
                          {/* DURATION TEXT */}
                          <strong>Route {idx + 1}</strong> • {formatDuration(route.duration)} ({formatDistance(route.distance)})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* --- 6. ACTION BUTTONS --- */}
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
                            setSheetOpen(false); // Close bottom sheet
                            handleStartNavigation(); // Start the walk immediately
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