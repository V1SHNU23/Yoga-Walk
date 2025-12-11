import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
// Import Reorder and useDragControls for the drag-and-drop functionality
import { Reorder, useDragControls } from "motion/react";
import redMarker from "../icons/red-marker.svg"; 
import SearchIcon from "../icons/search.svg";
// Import both Outline and Fill icons
import UserLocationIcon from "../icons/User-Location.svg"; 
import UserLocationFillIcon from "../icons/User-Location-Fill.svg"; 
// IMPORT THE CARD COMPONENT
import WalkSummaryCard from "../components/WalkSummaryCard";

// --- STATIC DATA FOR CARD CONTENT ---
const POSE_DETAILS = {
  default: {
    gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDdtY3h6bnh6aG56aG56aG56aG56aG56aG56aG56aG56/3o7qE1YN7aQf3lrGWg/giphy.gif",
    benefits: [
      "Improves flexibility and balance.",
      "Calms the mind and reduces stress.",
      "Strengthens core muscles."
    ],
    question: "How did your body feel during this pose?"
  },
  "Tree pose": {
    gif: "https://media.giphy.com/media/3oKIPavRPgJYA2QWku/giphy.gif", 
    benefits: [
      "Strengthens thighs, calves, ankles, and spine.",
      "Stretches the groins and inner thighs.",
      "Improves sense of balance."
    ],
    question: "Were you able to find a focal point to keep your balance?"
  },
  "Mountain pose": {
    gif: null, 
    benefits: [
      "Improves posture.",
      "Strengthens thighs, knees, and ankles.",
      "Firms abdomen and buttocks."
    ],
    question: "Did you feel grounded through your feet?"
  },
  "Warrior two": {
    gif: "https://media.giphy.com/media/l41lYCDgxP6OFBruE/giphy.gif",
    benefits: [
        "Strengthens and stretches legs and ankles.",
        "Stretches groins, chest, lungs, and shoulders.",
        "Increases stamina."
    ],
    question: "Did you feel strong and stable in this stance?"
  }
};

const CHECKPOINT_TABS = ["Overview", "Benefits", "Reflect"];

// --- CONFIG ---
const defaultCenter = {
  lat: -33.8688, // fallback Sydney
  lng: 151.2093,
};

const WALK_SPEED_KMH = 5;
const STEP_ADVANCE_THRESHOLD = 20;

// --- HELPER COMPONENTS ---

// 1. Grip Icon (The visual handle for dragging)
function GripIcon({ dragControls }) {
  return (
    <div 
      className="drag-handle"
      onPointerDown={(e) => dragControls.start(e)}
      style={{ cursor: 'grab', padding: '0 12px', display: 'flex', alignItems: 'center', color: '#a0a0a0' }}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.6 }}>
        <path d="M2 6H18M2 10H18M2 14H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// 2. Draggable Item Wrapper
const DraggableItem = ({ value, children }) => {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={value}
      dragListener={false} 
      dragControls={dragControls} 
      style={{ position: "relative", marginBottom: 0 }}
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

// --- UPDATED USER LOCATION BUTTON (FIXED) ---
function UserLocationButton({ userLocation, setHeading }) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const btnRef = useRef(null);

  // Use Leaflet's built-in utility to stop map clicks passing through this button
  useEffect(() => {
    if (btnRef.current) {
      L.DomEvent.disableClickPropagation(btnRef.current);
      L.DomEvent.disableScrollPropagation(btnRef.current);
    }
  }, []);

  const handleLocate = (e) => {
    // 1. Trigger Visual Feedback
    setIsLocating(true);
    setTimeout(() => {
      setIsLocating(false);
    }, 100);

    // 2. Recenter Map
    if (userLocation) {
      map.setView(userLocation, 16, { animate: true });
    } else {
      alert("Waiting for location...");
    }

    // 3. Request Compass Permissions (iOS 13+)
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      DeviceOrientationEvent.requestPermission()
        .then((response) => {
          if (response === "granted") {
            // Permission granted
          } else {
            alert("Compass permission denied");
          }
        })
        .catch(console.error);
    }
  };

  return (
    <button
      ref={btnRef} // Attach ref so Leaflet can disable propagation
      className="map-locate-fab"
      onClick={handleLocate}
      style={{
        position: "absolute",
        top: "20px", 
        right: "16px", 
        zIndex: 1000,
        width: "48px",
        height: "48px",
        borderRadius: "12px", 
        background: "white",
        border: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px", 
        transition: "transform 0.1s ease",
        userSelect: "none" // Prevent selection
      }}
    >
      <img 
        src={isLocating ? UserLocationFillIcon : UserLocationIcon} 
        alt="Locate Me" 
        draggable="false" // FIX: Prevents the "ghost image" drag effect
        style={{ 
            width: "100%", 
            height: "100%", 
            objectFit: "contain",
            pointerEvents: "none" // Ensures click hits the button, not the image
        }} 
      />
    </button>
  );
}

// --- UTILITY FUNCTIONS ---

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

// --- MAIN COMPONENT ---

export default function MapPage() {
  const [map, setMap] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [checkpointCount, setCheckpointCount] = useState(5);

  const [checkpoints, setCheckpoints] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);

  // Active Walk State
  const [isWalking, setIsWalking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Overlay State (Checkpoint Details)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [visitedIndices, setVisitedIndices] = useState(new Set()); 
  
  // --- SWIPEABLE CARD STATE ---
  const [activeSlide, setActiveSlide] = useState(0); 
  const slidesRef = useRef(null); 

  // --- LOCATION & HEADING (COMPASS) STATE ---
  // OPTIMIZATION: Initialize with cache if available for instant load
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const saved = localStorage.getItem("lastKnownLocation");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [heading, setHeading] = useState(0); // 0-360 degrees
  const [geoError, setGeoError] = useState("");
  // Flag to suppress Origin Marker if user chose "Use my current location"
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

  // --- DRAG SCROLL STATE (FOR PC USERS) ---
  const routesContainerRef = useRef(null);
  const [isDraggingRoute, setIsDraggingRoute] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Country Code State for strict filtering
  const [userCountryCode, setUserCountryCode] = useState(null);

  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [checkpointPositions, setCheckpointPositions] = useState([]);
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectionStep, setSelectionStep] = useState("destination");

  // Summary Card State
  const [showSummary, setShowSummary] = useState(false);
  const [finalMetrics, setFinalMetrics] = useState(null);

  const apiBase = "http://localhost:5000";
  const lastStepChangeRef = useRef(Date.now());
  const searchTimeoutRef = useRef(null);

  const walkStartTimeRef = useRef(null);

  // --- 1. RESTORE STATE ON LOAD ---
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
        } catch (e) {
            console.error("Failed to restore walk state", e);
        }
    }
  }, []);

  // --- 2. SAVE STATE ON CHANGE ---
  useEffect(() => {
    // Only save if we have actual data (origin or destination)
    if (destination || origin) {
        const stateToSave = {
            origin,
            destination,
            routes,
            checkpoints,
            checkpointPositions,
            isWalking,
            currentStep,
            activeRouteIndex,
            visitedIndices: Array.from(visitedIndices), // Convert Set to Array for storage
            startTime: walkStartTimeRef.current,
            selectionStep,
            sheetOpen,
            originLabel,
            destinationLabel
        };
        localStorage.setItem("activeWalkState", JSON.stringify(stateToSave));
    }
  }, [origin, destination, routes, checkpoints, checkpointPositions, isWalking, currentStep, activeRouteIndex, visitedIndices, selectionStep, sheetOpen, originLabel, destinationLabel]);

  // --- RESET SLIDE SCROLL ON OPEN ---
  useEffect(() => {
    if (selectedCheckpoint) {
      setActiveSlide(0);
      if (slidesRef.current) {
        slidesRef.current.scrollTo({ left: 0, behavior: 'auto' });
      }
    }
  }, [selectedCheckpoint]);

  // Sync inputs with labels
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

  // --- SLIDE SCROLL HANDLER (Syncs dots with swipe) ---
  const handleSlideScroll = () => {
    if (slidesRef.current) {
      const { scrollLeft, clientWidth } = slidesRef.current;
      const pageIndex = Math.round(scrollLeft / clientWidth);
      setActiveSlide(pageIndex);
    }
  };

  // --- PROGRAMMATIC SCROLL FOR DOT CLICKS (PC Support) ---
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

  // --- OPTIMIZED LOCATION & COMPASS LOGIC ---
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Location is not supported.");
      return;
    }

    // 1. FAST: Get Coarse Location (WiFi/Cell)
    // Low accuracy is much faster (often <500ms) than waiting for GPS warmup
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newLoc = { lat: latitude, lng: longitude };
        setUserLocation(newLoc);
        // Persist immediately for next load
        localStorage.setItem("lastKnownLocation", JSON.stringify(newLoc));
      },
      (err) => console.warn("Coarse location failed (non-critical)", err),
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
    );

    // 2. PRECISE: Start watching for GPS (this takes longer but updates later)
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
      (err) => {
        console.error("Geo error", err);
        // Only show error if we have NO location at all (cache failed + coarse failed)
        if (!userLocation) setGeoError("Could not access your location.");
      },
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

  // --- DYNAMIC LOCATION PUCK ICON ---
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
    
    // Calculate distance to the final destination
    const distToEnd = distanceMeters(userLocation, destination);
    
    // If within 30 meters, trigger the finish logic automatically
    if (distToEnd < 30) {
       handleStopNavigation();
    }
  }, [userLocation, destination, isWalking]);

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

  // --- ROUTE CALCULATOR ---
// Fetch helpers (OSRM)
  function formatDistance(m) {
    if (m == null) return "";
    if (m < 1000) return `${m.toFixed(0)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  }

  // UPDATED: Now fetches alternatives and returns an ARRAY of routes
  async function fetchSingleRoute(pointList) {
    const coordString = pointList.map((p) => `${p.lng},${p.lat}`).join(";");
    
    // 1. Ask OSRM for multiple paths (alternatives=true)
    const url = `https://router.project-osrm.org/route/v1/foot/${coordString}?overview=full&geometries=geojson&steps=true&alternatives=true`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not get route");

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) throw new Error("No route found");

    // 2. Return an ARRAY of formatted routes (Note the .map here)
    return data.routes.map(route => {
        const coords = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
        const distance = route.distance;
        
        // Calculate duration based on your app's speed setting
        const walkDurationSeconds = (distance * 3.6) / WALK_SPEED_KMH;

        const steps = route.legs[0].steps.map(step => ({
          instruction: step.maneuver.type === 'depart' 
            ? `Head ${step.maneuver.modifier || 'forward'} on ${step.name || 'road'}`
            : `${step.maneuver.type} ${step.maneuver.modifier || ''} ${step.name ? 'on ' + step.name : ''}`,
          distance: step.distance,
          maneuver: step.maneuver 
        }));

        return { coords, distance, duration: walkDurationSeconds, steps };
    });
  }

  async function fetchRoutes(originPoint, destinationPoint) {
    const routesList = [];
    const timestamp = Date.now(); 
    let idCounter = 0;

    try {
      // 1. Get Direct Routes
      // This now returns an ARRAY, so we must loop through it!
      const directs = await fetchSingleRoute([originPoint, destinationPoint]);
      
      directs.forEach(route => {
          routesList.push({ id: `${timestamp}-${idCounter++}`, ...route });
      });
    } catch (e) {
      console.warn("Direct route failed", e);
    }

    // 2. Get Via Routes (Midpoint offsets)
    const midLat = (originPoint.lat + destinationPoint.lat) / 2;
    const midLng = (originPoint.lng + destinationPoint.lng) / 2;
    const viaCandidates = [
      offsetPoint(midLat, midLng, 250, 0),
      offsetPoint(midLat, midLng, -250, 0),
      offsetPoint(midLat, midLng, 0, 250),
      offsetPoint(midLat, midLng, 0, -250),
    ];

    for (const via of viaCandidates) {
      if (routesList.length >= 6) break; // Limit total routes to avoid UI clutter
      try {
        const viaRoutes = await fetchSingleRoute([originPoint, via, destinationPoint]);
        
        // Loop through the array of results
        viaRoutes.forEach(route => {
             routesList.push({ id: `${timestamp}-${idCounter++}`, ...route });
        });
      } catch (e) {}
    }

    if (!routesList.length) throw new Error("No route found");
    return routesList;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // 🟢 1. BETTER ERROR CHECKING
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
      // 🟢 2. USE THE EXISTING FUNCTION 'fetchRoutes'
      const routeOptions = await fetchRoutes(origin, destination);
      setRoutes(routeOptions);
      setActiveRouteIndex(0);

      // 🟢 3. SETUP CHECKPOINTS
      const selectedRoute = routeOptions[0];
      updateCheckpointPositionsForRoute(selectedRoute, Number(checkpointCount));

      // 🟢 4. FETCH CHECKPOINTS FROM BACKEND (Optional, keeps existing logic)
      const payload = {
        origin,
        destination,
        checkpoint_count: Number(checkpointCount),
      };

      const res = await fetch(`${apiBase}/api/journey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCheckpoints(data.checkpoints || []);
      }
      
      setVisitedIndices(new Set()); 
      setSheetOpen(true);

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
      setSheetOpen(true);
      walkStartTimeRef.current = Date.now();
    }
  }

  // --- FIXED END WALK LOGIC ---
  const handleStopNavigation = () => {
    const endTime = Date.now();
    const startTime = walkStartTimeRef.current || endTime;
    const durationMs = endTime - startTime;
    const durationSeconds = Math.max(0, Math.round(durationMs / 1000));
    
    // Calculate REAL distance walked (Sum of completed steps ONLY)
    let distanceMeters = 0;
    const activeRoute = routes[activeRouteIndex];
    if (activeRoute && activeRoute.steps) {
        // Only sum the steps that have been fully completed
        // (indices 0 up to currentStep)
        for (let i = 0; i < currentStep; i++) {
            distanceMeters += activeRoute.steps[i].distance || 0;
        }
    }
    
    const distanceKm = (distanceMeters / 1000).toFixed(2);
    
    // Prepare metrics for the card
    setFinalMetrics({
        distance: distanceKm,
        duration: durationSeconds,
        checkpoints: visitedIndices.size, // Number of poses completed
        steps: Math.round(distanceMeters * 1.35),
        calories: Math.round(distanceKm * 65)
    });

    setShowSummary(true); // <--- This triggers the popup card!
    setSheetOpen(false); // <--- NEW: Folds down the bottom sheet!
  };

  const handleSaveAndClose = async () => {
    try {
        await fetch(`${apiBase}/api/walk_complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                distance_km: finalMetrics.distance,
                duration_seconds: finalMetrics.duration,
                checkpoints_completed: finalMetrics.checkpoints,
                start_coords: origin, 
                end_coords: destination,
                yoga_poses_performed: [] // Add specific pose names if you track them
            }),
        });
        console.log("Walk saved successfully!");
    } catch (e) {
        console.error("Save failed", e);
    }

    // Reset UI State
    setShowSummary(false);
    setFinalMetrics(null);
    handleReset(); 
  };

  function handleReset() {
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
    setSheetOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setOriginQuery("");
    setOriginResults([]);

    if (map && userLocation) {
        map.flyTo(userLocation, 15, { animate: true });
    }
  }

  // localStorage.removeItem("activeWalkState"); 
  // Commented out to prevent accidental clearing during refreshes, 
  // handleReset() clears it when walk is actually done/cancelled.

  // --- EVENT HANDLERS ---
  async function handleMapClick(latlng) {
    if (isWalking) return; 

    const { lat, lng } = latlng;

    if (selectionStep === "originOnMap") {
      setOrigin({ lat, lng });
      setIsOriginCurrentLocation(false); 
      const orgLabel = await reverseGeocode(lat, lng);
      setOriginLabel(orgLabel);
      if (destination) {
        calculateRoute({ lat, lng }, destination);
      }
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
        calculateRoute(origin, { lat, lng });
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
    
    if (newOrigin && newDestination) {
        calculateRoute(newOrigin, newDestination);
    } else {
        setRoutes([]);
        setActiveRouteIndex(0);
        setCheckpoints([]);
        setCheckpointPositions([]);
    }
    setSelectionStep("done");
  }

  // --- RENDER HELPERS ---
  const activeRoute = routes[activeRouteIndex];
  const sheetSummaryText = isWalking ? "Current Navigation" : "Plan your Yoga Walk";

  return (
    <div className="mapPageRoot">
      <div className="mapWrapper">
        
        {/* --- ADDED SUMMARY CARD OVERLAY --- */}
        {showSummary && finalMetrics && (
          <WalkSummaryCard 
            distance={finalMetrics.distance}
            duration={finalMetrics.duration}
            checkpoints={finalMetrics.checkpoints}
            onSave={handleSaveAndClose}
            onClose={() => setShowSummary(false)} // <--- NEW: Handle Close Action
          />
        )}

        <MapContainer
          ref={setMap}
          center={defaultCenter}
          zoom={13}
          className="mapContainer"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          <ClickHandler onClick={handleMapClick} />
          <UserLocationButton userLocation={userLocation} setHeading={setHeading} />

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

            return (
              <Marker
                key={`time-pill-${route.id}`}
                position={midPoint}
                icon={createDurationIcon(route.duration, isActive)}
                zIndexOffset={isActive ? 1000 : 500}
                eventHandlers={{
                  click: () => setActiveRouteIndex(idx),
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
                  click: () => setActiveRouteIndex(idx),
                }}
              />
            );
          })}

          {/* Render ACTIVE route last */}
          {routes[activeRouteIndex] && (
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
        </MapContainer>
      </div>

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
              {/* SLIDE 1: OVERVIEW */}
              <div className="cp-slide">
                <div className="cp-detail-meta">
                  <span className="cp-meta-item">⏱ {selectedCheckpoint.exercise?.duration || "30 sec"}</span>
                  <span className="cp-meta-item">🧘 Beginner Friendly</span>
                </div>
                <div className="cp-gif-placeholder">
                  {POSE_DETAILS[selectedCheckpoint.exercise?.name]?.gif ? (
                    <img src={POSE_DETAILS[selectedCheckpoint.exercise?.name].gif} alt="Pose" className="cp-gif-img" />
                  ) : (
                    <span className="cp-gif-label">GIF Placeholder</span>
                  )}
                </div>
                <p className="cp-detail-desc">
                  Stop and perform this pose. Take a deep breath and enjoy the surroundings!
                </p>
              </div>

              {/* SLIDE 2: BENEFITS */}
              <div className="cp-slide">
                <h3 style={{fontSize: '18px', marginBottom: '16px', color: '#1f3d1f'}}>Benefits</h3>
                <ul className="cp-benefits-list">
                  {(POSE_DETAILS[selectedCheckpoint.exercise?.name] || POSE_DETAILS["default"]).benefits.map((benefit, i) => (
                    <li key={i} className="cp-benefit-item">
                      <span className="cp-benefit-icon">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* SLIDE 3: REFLECTION */}
              <div className="cp-slide">
                <div className="cp-question-container">
                  <span className="cp-question-icon">🤔</span>
                  <p className="cp-question-text">
                    {(POSE_DETAILS[selectedCheckpoint.exercise?.name] || POSE_DETAILS["default"]).question}
                  </p>
                </div>
                <p className="cp-detail-desc" style={{textAlign: 'center', marginTop: '12px'}}>
                  Take a moment to reflect before continuing your walk.
                </p>
                <button 
                  className="cp-complete-block-btn"
                  onClick={() => setSelectedCheckpoint(null)}
                >
                  Complete Checkpoint
                </button>
              </div>
            </div>

            {/* PAGINATION DOTS (Clickable) */}
            <div className="cp-pagination">
                {[0, 1, 2].map((i) => (
                    <div 
                        key={i}
                        className={`cp-dot ${activeSlide === i ? 'active' : ''}`} 
                        onClick={() => scrollToSlide(i)}
                        style={{ cursor: 'pointer', padding: '4px' }}
                    />
                ))}
            </div>
          </div>
        </div>
      )}

      {/* --- BOTTOM SHEET --- */}
      <section className="mapCheckpointSection">
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
            {isWalking && activeRoute ? (
              /* 1. ACTIVE WALK MODE */
              <div className="activeWalkContainer">
                {/* --- HEADER ROW WITH BACK BUTTON --- */}
                <div className="active-walk-header-row">
                  <button 
                    className="active-walk-back-btn" 
                    onClick={() => {
                      setIsWalking(false);
                    }}
                  >
                    ‹
                  </button>
                  <div className="activeWalkHeader">Let's Go!</div>
                  <div style={{ width: '40px' }}></div>
                </div>

                <div className="directionCard">
                  <div className="directionLabel">Current Instruction</div>
                  <div className="directionMain">{activeRoute.steps?.[currentStep]?.instruction || "Head towards destination"}</div>
                  <div className="directionSub"><span>for</span><strong>{formatDistance(activeRoute.steps?.[currentStep]?.distance)}</strong></div>
                </div>
                <div className="activeNavButtons">
                  <button className="btn-nav-next" onClick={advanceStep}>Next Step</button>
                  <button className="btn-nav-end" onClick={handleStopNavigation}>End Walk</button>
                </div>
                
                {/* --- UPGRADED DEVELOPER TOOLS --- */}
                <div style={{ marginTop: '20px', padding: '12px', background: '#f0f4f0', borderRadius: '12px', border: '1px solid #dcefdc' }}>
                  <p style={{ margin: '0 0 10px', color: '#1f3d1f', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🕵️ Developer Teleport
                  </p>
                  
                  {/* 1. Next Turn */}
                  <button
                    type="button"
                    style={{ background: '#6a7a6e', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', width: '100%', cursor: 'pointer', marginBottom: '8px' }}
                    onClick={() => {
                      const targetStep = activeRoute.steps?.[currentStep + 1];
                      if (targetStep && targetStep.maneuver) {
                        const [lng, lat] = targetStep.maneuver.location;
                        setUserLocation({ lat, lng });
                      } else {
                        alert("No more steps in route!");
                      }
                    }}
                  >
                    📍 Jump to Next Turn
                  </button>

                  {/* 2. Dynamic Checkpoint Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
                    {checkpointPositions.map((pos, i) => (
                      <button
                        key={i}
                        type="button"
                        style={{ background: '#61b329', color: 'white', border: 'none', padding: '8px 0', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => setUserLocation(pos)}
                      >
                        CP {i + 1}
                      </button>
                    ))}
                  </div>

                  {/* 3. Destination (Finish) */}
                  <button
                    type="button"
                    style={{ background: '#c0392b', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', width: '100%', cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => {
                      if (destination) {
                        setUserLocation(destination);
                      }
                    }}
                  >
                    🏁 Jump to Finish (Test End)
                  </button>
                </div>
                {/* -------------------------------- */}

              </div>
            ) : (
              /* 2. PLANNING UI */
              <>
                {geoError && <p className="mapGeoErrorInline">{geoError}</p>}
                
                {/* --- 1. DIRECTIONS (Draggable Timeline) --- */}
                <div className="abstract-timeline">
                    <div className="timeline-line"></div>
                    <div className="timeline-point start"></div>
                    <div className="timeline-point end"></div>

                    {/* DRAGGABLE LIST */}
                    <Reorder.Group 
                      axis="y" 
                      values={fieldOrder} 
                      onReorder={handleReorder} 
                      className="reorder-list"
                      style={{listStyle: "none", padding: 0, margin: 0}}
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

                {/* --- 2. CHECKPOINTS (Moved Up) --- */}
                <div className="checkpoint-control-abstract">
                    <div className="checkpoint-header">
                        <span className="checkpoint-label">🧘 Yoga Checkpoints</span>
                        <span className="checkpoint-count-display">{checkpointCount}</span>
                    </div>
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
                    <div style={{display:'flex', justifyContent:'space-between', marginTop:'8px', fontSize:'11px', color:'#888'}}>
                        <span>1</span>
                        <span>10</span>
                    </div>
                </div>    

                {/* --- 3. ROUTES (Moved Down) --- */}
                {routes.length > 1 && (
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
                )}

                {/* --- 4. ACTION BUTTONS --- */}
                <form onSubmit={handleSubmit}>
                  <div className="action-buttons-abstract">
                    {routes.length > 0 ? (
                      <>
                        <button className="btn-abstract btn-primary" type="button" onClick={handleStartNavigation}>Start Walk</button>
                        <button className="btn-abstract btn-secondary" type="submit" disabled={loading}>{loading ? "..." : "Refresh"}</button>
                      </>
                    ) : (
                      <>
                        <button className="btn-abstract btn-primary" type="submit" disabled={loading}>{loading?"Finding...":"Find Routes"}</button>
                        <button className="btn-abstract btn-secondary" type="button" onClick={handleReset}>Clear</button>
                      </>
                    )}
                  </div>
                </form>
                {errorMsg && <p className="mapErrorInline" style={{marginTop:'20px', textAlign:'center'}}>{errorMsg}</p>}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}