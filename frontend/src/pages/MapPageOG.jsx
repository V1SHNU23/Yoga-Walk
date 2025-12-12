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
import redMarker from "../icons/red-marker.svg";
import SearchIcon from "../icons/search.svg"; 

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

// --- ICONS ---
const userIcon = L.icon({
  iconUrl: redMarker,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const defaultCenter = {
  lat: -33.8688, // fallback Sydney
  lng: 151.2093,
};

// --- CONSTANTS ---
const WALK_SPEED_KMH = 5;
const STEP_ADVANCE_THRESHOLD = 20; // meters

// --- HELPER COMPONENTS ---

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

function RecenterOnUser({ userLocation }) {
  const map = useMap();
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    if (userLocation && !hasCentered) {
      map.setView(userLocation, 15);
      setHasCentered(true);
    }
  }, [userLocation, map, hasCentered]);

  return null;
}

// --- UTILITY FUNCTIONS ---

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
    iconAnchor: [0, 0] 
  });
}

// --- MAIN COMPONENT ---

export default function MapPage() {
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
  const [cardPage, setCardPage] = useState(0); // 0 = Info, 1 = Benefits, 2 = Question
  const [visitedIndices, setVisitedIndices] = useState(new Set()); 

  // Mobile UI States
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // NEW: Search state

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState("");
  
  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [checkpointPositions, setCheckpointPositions] = useState([]);
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectionStep, setSelectionStep] = useState("destination");

  const apiBase = "http://localhost:5000";
  const lastStepChangeRef = useRef(Date.now());

  // Reset card page when a new checkpoint opens
  useEffect(() => {
    if (selectedCheckpoint) {
      setCardPage(0);
    }
  }, [selectedCheckpoint]);

  // Sync search input with destination label
  useEffect(() => {
    if (destinationLabel) {
      setSearchQuery(destinationLabel);
    }
  }, [destinationLabel]);

  // 1. Geolocation Hook
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Location is not supported in this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setGeoError("");
      },
      (err) => {
        console.error("Geo error", err);
        setGeoError("Could not access your location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 1000,
      }
    );

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 2. Automatic Navigation Hook
  useEffect(() => {
    if (!isWalking || !userLocation || !routes[activeRouteIndex]) return;

    const activeRoute = routes[activeRouteIndex];
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

  // --- LOGIC FUNCTIONS ---

  function advanceStep() {
    const activeRoute = routes[activeRouteIndex];
    if (currentStep < activeRoute.steps.length - 1) {
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

  // NEW: Search for a place by name
  async function handleSearchSubmit(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      // Use Nominatim API to get coords from text
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newDest = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
        
        setDestination(newDest);
        // Shorten the display name
        setDestinationLabel(result.display_name.split(",")[0]);
        setSelectionStep("done");
        
        // Ensure sheet is open
        setSheetOpen(true);
      } else {
        setErrorMsg("Location not found. Try a specific place name.");
      }
    } catch (err) {
      console.error("Search failed", err);
      setErrorMsg("Search failed. Please check internet.");
    }
  }

  function formatDistance(m) {
    if (m == null) return "";
    if (m < 1000) return `${m.toFixed(0)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  }

  function formatDuration(s) {
    if (s == null) return "";
    const minutes = Math.round(s / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) return `${hours} hr`;
    return `${hours} hr ${rem} min`;
  }

  async function fetchSingleRoute(pointList) {
    const coordString = pointList.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/foot/${coordString}?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not get route");

    const data = await res.json();
    if (!data.routes || !data.routes[0]) throw new Error("No route found");

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    const distance = route.distance;
    const walkDurationSeconds = (distance * 3.6) / WALK_SPEED_KMH;

    const steps = route.legs[0].steps.map(step => ({
      instruction: step.maneuver.type === 'depart' 
        ? `Head ${step.maneuver.modifier || 'forward'} on ${step.name || 'road'}`
        : `${step.maneuver.type} ${step.maneuver.modifier || ''} ${step.name ? 'on ' + step.name : ''}`,
      distance: step.distance,
      maneuver: step.maneuver 
    }));

    return { coords, distance, duration: walkDurationSeconds, steps };
  }

  async function fetchRoutes(originPoint, destinationPoint) {
    const routesList = [];
    let idCounter = 0;

    try {
      const direct = await fetchSingleRoute([originPoint, destinationPoint]);
      routesList.push({ id: idCounter++, ...direct });
    } catch (e) {
      console.warn("Direct route failed", e);
    }

    const midLat = (originPoint.lat + destinationPoint.lat) / 2;
    const midLng = (originPoint.lng + destinationPoint.lng) / 2;
    const mid = { lat: midLat, lng: midLng };

    const viaCandidates = [
      offsetPoint(mid.lat, mid.lng, 250, 0),
      offsetPoint(mid.lat, mid.lng, -250, 0),
      offsetPoint(mid.lat, mid.lng, 0, 250),
      offsetPoint(mid.lat, mid.lng, 0, -250),
    ];

    for (const via of viaCandidates) {
      if (routesList.length >= 4) break;
      try {
        const viaRoute = await fetchSingleRoute([originPoint, via, destinationPoint]);
        routesList.push({ id: idCounter++, ...viaRoute });
      } catch (e) {
        console.warn("Via route failed");
      }
    }

    if (!routesList.length) throw new Error("No route found");
    return routesList;
  }

  // --- EVENT HANDLERS ---

  async function handleMapClick(latlng) {
    if (isWalking) return; 

    const { lat, lng } = latlng;
    setRoutes([]);
    setActiveRouteIndex(0);
    setCheckpoints([]);
    setErrorMsg("");
    setCheckpointPositions([]);

    if (selectionStep === "destination" || selectionStep === "done") {
      setDestination({ lat, lng });
      const destLabel = await reverseGeocode(lat, lng);
      setDestinationLabel(destLabel);
      setOrigin(null);
      setOriginLabel("");
      setSelectionStep("chooseOrigin");
      setSheetOpen(true);
      return;
    }

    if (selectionStep === "originOnMap") {
      setOrigin({ lat, lng });
      const orgLabel = await reverseGeocode(lat, lng);
      setOriginLabel(orgLabel);
      setSelectionStep("done");
      setSheetOpen(true);
    }
  }

  function handleSwapLocations() {
    if (!origin || !destination) return;
    const newOrigin = destination;
    const newDestination = origin;
    const newOriginLabel = destinationLabel;
    const newDestinationLabel = originLabel;
    
    setOrigin(newOrigin);
    setDestination(newDestination);
    setOriginLabel(newOriginLabel);
    setDestinationLabel(newDestinationLabel);
    setRoutes([]);
    setActiveRouteIndex(0);
    setCheckpoints([]);
    setCheckpointPositions([]);
    setErrorMsg("");
    setSelectionStep("done");
    setSheetOpen(true);
  }

  async function handleUseMyLocation() {
    if (!destination) {
      setErrorMsg("Choose where you want to go first.");
      return;
    }
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
        return;
      }
    }
    setOrigin(loc);
    const label = await reverseGeocode(loc.lat, loc.lng);
    setOriginLabel(label);
    setSelectionStep("done");
    setErrorMsg("");
    setSheetOpen(true);
  }

  function handleChooseStartOnMap() {
    if (!destination) {
      setErrorMsg("Choose where you want to go first.");
      return;
    }
    setSelectionStep("originOnMap");
    setErrorMsg("");
    setSheetOpen(true);
  }

  // 1. Find routes and show on map
  async function handleSubmit(e) {
    e.preventDefault();
    if (!origin || !destination) {
      setErrorMsg("Please choose destination and starting point.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    
    try {
      const routeOptions = await fetchRoutes(origin, destination);
      setRoutes(routeOptions);
      setActiveRouteIndex(0);

      const selectedRoute = routeOptions[0];
      updateCheckpointPositionsForRoute(selectedRoute, Number(checkpointCount));

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

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();
      setCheckpoints(data.checkpoints || []);
      setVisitedIndices(new Set()); 
      setSheetOpen(true);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 2. Start the walk
  function handleStartNavigation() {
    if (routes.length > 0 && routes[activeRouteIndex]) {
      setIsWalking(true);
      setCurrentStep(0);
      setVisitedIndices(new Set()); // Ensure tracking starts fresh
      setSheetOpen(true);
    }
  }

  function handleReset() {
    setOrigin(null);
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
  }

  // --- RENDER HELPERS ---
  const getCheckpointContent = () => {
    if (!selectedCheckpoint) return null;
    
    const poseName = selectedCheckpoint.exercise?.name || "Yoga Pose";
    const details = POSE_DETAILS[poseName] || POSE_DETAILS["default"];

    if (cardPage === 0) {
      // PAGE 1: INSTRUCTION + GIF
      return (
        <>
          <div className="cp-gif-placeholder">
            {details.gif ? (
                <img src={details.gif} alt={poseName} className="cp-gif-img" />
            ) : (
                <span className="cp-gif-label">GIF Placeholder</span>
            )}
          </div>
          <p className="cp-detail-desc">
            Stop and perform this pose. Take a deep breath and enjoy the surroundings!
          </p>
        </>
      );
    } else if (cardPage === 1) {
      // PAGE 2: BENEFITS
      return (
        <>
          <h3 style={{fontSize: '16px', marginBottom: '10px', color: '#1f3d1f'}}>Benefits</h3>
          <ul className="cp-benefits-list">
            {details.benefits.map((benefit, i) => (
                <li key={i} className="cp-benefit-item">
                    <span className="cp-benefit-icon">✓</span>
                    {benefit}
                </li>
            ))}
          </ul>
        </>
      );
    } else {
      // PAGE 3: REFLECTION
      return (
        <>
          <div className="cp-question-container">
            <span className="cp-question-icon">🤔</span>
            <p className="cp-question-text">{details.question}</p>
          </div>
          <p className="cp-detail-desc" style={{textAlign: 'center'}}>
            Take a moment to reflect before continuing your walk.
          </p>
          <button 
            className="cp-complete-block-btn"
            onClick={() => setSelectedCheckpoint(null)}
          >
            Complete Checkpoint
          </button>
        </>
      );
    }
  };

  const initialCenter = userLocation || defaultCenter;
  const activeRoute = routes[activeRouteIndex] || null;

  const checkpointCountActual = checkpoints.length || checkpointCount;
  const nextExerciseName = checkpoints[0]?.exercise?.name || "First checkpoint";
  const hasJourney = !!activeRoute;
  
  const sheetSummaryText = isWalking 
    ? "Current Navigation"
    : hasJourney
    ? `${checkpointCountActual} checkpoints · Next: ${nextExerciseName}`
    : "Plan your yoga walk";

  return (
    <div className="mapPageRoot">
      
      <div className="mapWrapper">
        <MapContainer
          center={initialCenter}
          zoom={13}
          className="mapContainer"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          <ClickHandler onClick={handleMapClick} />
          <RecenterOnUser userLocation={userLocation} />

          {userLocation && <Marker position={userLocation} icon={userIcon} />}
          {origin && <Marker position={origin} />}
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

          {/* ROUTES and TIME PILLS */}
          {routes.map((route, idx) => {
            const isActive = idx === activeRouteIndex;
            const mid = route.coords[Math.floor(route.coords.length / 2)];
            
            // Offset logic for labels
            const latOffset = (idx % 2 === 0 ? 1 : -1) * (idx * 0.0003); 
            const labelPos = offsetPoint(mid.lat, mid.lng, latOffset * 111320, 0);

            return (
              <div key={route.id}>
                <Polyline
                  positions={route.coords}
                  className={isActive ? "route-line routeLineActive" : "route-line routeLineAlt"}
                  eventHandlers={{
                    click: () => { if (!isWalking) setActiveRouteIndex(idx); }
                  }}
                />
                
                <Marker
                  position={labelPos}
                  icon={createDurationIcon(route.duration, isActive)}
                  zIndexOffset={isActive ? 1000 : 10} 
                  eventHandlers={{
                    click: () => { if (!isWalking) setActiveRouteIndex(idx); }
                  }}
                />
              </div>
            );
          })}

        </MapContainer>
      </div>

      {/* --- CHECKPOINT DETAIL OVERLAY --- */}
      {selectedCheckpoint && (
        <div className="checkpoint-overlay-backdrop" onClick={() => setSelectedCheckpoint(null)}>
          <div className="checkpoint-detail-card" onClick={(e) => e.stopPropagation()}>
            {/* SIDE BUTTON: PREV */}
            {cardPage > 0 && (
                <button className="cp-side-btn left" onClick={() => setCardPage(prev => prev - 1)}>‹</button>
            )}

            <div className="cp-detail-header">
              <span className="cp-detail-badge">Checkpoint {selectedCheckpoint.index}</span>
              <button className="cp-close-btn" onClick={() => setSelectedCheckpoint(null)}>×</button>
            </div>
            
            <h2 className="cp-detail-title">
              {selectedCheckpoint.exercise?.name || "Yoga Pose"}
            </h2>
            
            {cardPage === 0 && (
                <div className="cp-detail-meta">
                    <span className="cp-meta-item">⏱ {selectedCheckpoint.exercise?.duration || "30 sec"}</span>
                    <span className="cp-meta-item">🧘 Beginner Friendly</span>
                </div>
            )}

            <div className="cp-pagination">
                <div className={`cp-dot ${cardPage === 0 ? 'active' : ''}`} />
                <div className={`cp-dot ${cardPage === 1 ? 'active' : ''}`} />
                <div className={`cp-dot ${cardPage === 2 ? 'active' : ''}`} />
            </div>

            <div style={{ minHeight: '180px' }}>
                {getCheckpointContent()}
            </div>

            {/* SIDE BUTTON: NEXT */}
            {cardPage < 2 && (
                <button className="cp-side-btn right" onClick={() => setCardPage(prev => prev + 1)}>›</button>
            )}
          </div>
        </div>
      )}

      {/* --- BOTTOM SHEET --- */}
      <section className="mapCheckpointSection">
        <div className={`mapCheckpointSheet ${sheetOpen ? "mapCheckpointSheetOpen" : "mapCheckpointSheetCollapsed"}`}>
          <div className="mapCheckpointSummaryBar" onClick={() => setSheetOpen((open) => !open)}>
            <span className="mapCheckpointSummaryText">{sheetSummaryText}</span>
          </div>

          <div className="mapCheckpointBody">
            {/* 1. ACTIVE WALK MODE */}
            {isWalking && activeRoute ? (
              <div className="activeWalkContainer">
                <div className="activeWalkHeader">Let's Go!</div>
                
                <div className="directionCard">
                  <div className="directionLabel">Current Instruction</div>
                  <div className="directionMain">
                     {activeRoute.steps[currentStep]?.instruction || "Head towards destination"}
                  </div>
                  <div className="directionSub">
                     <span>for</span>
                     <strong>{formatDistance(activeRoute.steps[currentStep]?.distance)}</strong>
                  </div>
                </div>

                <div className="nextUpHeader">Up Next</div>
                <div className="mapCheckpointItem">
                   <span className="mapCheckpointNumber">1</span>
                   <div className="mapCheckpointContent">
                      <div className="mapCheckpointLineMain">
                        {checkpoints[0]?.exercise?.name || "Yoga Pose"}
                      </div>
                      <div className="mapCheckpointLineSub">
                        at {formatDistance(checkpointPositions[0]?.distanceFromStart)} mark
                      </div>
                   </div>
                </div>

                <div className="activeNavButtons">
                  <button className="btn-nav-next" onClick={advanceStep}>Next Step (Manual)</button>
                  <button className="btn-nav-end" onClick={() => { setIsWalking(false); setSelectionStep("done"); }}>End Walk</button>
                </div>

                <div style={{ marginTop: '20px', padding: '10px', background: '#f8d7da', borderRadius: '12px', border: '1px solid #f5c6cb' }}>
                  <p style={{ margin: '0 0 8px', color: '#721c24', fontSize: '12px', fontWeight: 'bold' }}>🕵️ Developer Tools</p>
                  <button
                    type="button"
                    style={{ background: '#721c24', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', width: '100%', cursor: 'pointer', marginBottom: '8px' }}
                    onClick={() => {
                      const targetStep = activeRoute.steps[currentStep + 1];
                      if (targetStep && targetStep.maneuver) {
                        const [lng, lat] = targetStep.maneuver.location;
                        setUserLocation({ lat, lng });
                      } else { alert("No more steps!"); }
                    }}
                  >
                    Teleport to Next Turn
                  </button>
                  <button
                    type="button"
                    style={{ background: '#1c7224', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', width: '100%', cursor: 'pointer' }}
                    onClick={() => { if (checkpointPositions.length > 0) setUserLocation(checkpointPositions[0]); }}
                  >
                    Teleport to Checkpoint 1
                  </button>
                </div>
              </div>
            ) : (
              /* 2. PLANNING UI */
              <>
                {geoError && <p className="mapGeoErrorInline">{geoError}</p>}
                
                {/* Visual Inputs */}
                <div className="abstract-timeline">
                    <div className="timeline-line"></div>
                    <div className="timeline-point start"></div>
                    <div className="timeline-point end"></div>

                    <div className="location-row-abstract">
                        <div className="location-pill-abstract" onClick={handleUseMyLocation}>
                            {origin ? (originLabel || "My Location") : <span className="empty-text">From: Use my current location</span>}
                        </div>
                    </div>

                    <button type="button" className="swap-btn-abstract" onClick={handleSwapLocations} aria-label="Swap">⇄</button>

                    {/* NEW: SEARCH INPUT FOR DESTINATION */}
                    <div className="location-row-abstract">
                        <form className="map-search-form" onSubmit={handleSearchSubmit}>
                            <div className="location-pill-abstract" style={{padding:'8px 16px'}}>
                                <img src={SearchIcon} style={{width:18, height:18, opacity:0.5, marginRight:10}} alt="Search" />
                                <input 
                                    type="text" 
                                    style={{border:'none', width:'100%', fontSize:15, fontWeight:600, color:'#1f3d1f', outline:'none', background:'transparent'}}
                                    placeholder="Where to? (e.g. Hyde Park)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => { if(selectionStep === 'done') setSearchQuery(""); }}
                                />
                            </div>
                        </form>
                    </div>
                </div>

                {/* --- MOBILE: Horizontal Route Choices --- */}
                {routes.length > 1 && (
                  <div className="routeChoices">
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
                        Route {idx + 1} ({formatDistance(route.distance)})
                      </button>
                    ))}
                  </div>
                )}

                {/* Checkpoint Controls */}
                <div className="checkpoint-control-abstract" style={{padding: '16px'}}>
                    <div className="checkpoint-header" style={{marginBottom: '10px'}}>
                        <span>Yoga Checkpoints</span>
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
                </div>

                {/* --- MOBILE: Collapsible Checkpoint List --- */}
                {checkpoints.length > 0 && (
                  <>
                    <button 
                      type="button" 
                      className="checkpoint-toggle-btn"
                      onClick={() => setShowCheckpoints(!showCheckpoints)}
                    >
                      {showCheckpoints ? "Hide Checkpoint Details" : `View ${checkpoints.length} Checkpoints`}
                      <span className={`checkpoint-toggle-icon ${showCheckpoints ? 'open' : ''}`}>▼</span>
                    </button>

                    <ul className={`mapCheckpointList ${showCheckpoints ? 'expanded' : ''}`}>
                      {checkpoints.map((cp, idx) => {
                        const pos = checkpointPositions[idx];
                        return (
                          <li key={cp.id ?? idx} className="mapCheckpointItem">
                            <span className="mapCheckpointNumber">{idx + 1}</span>
                            <div className="mapCheckpointContent">
                              <div className="mapCheckpointLineMain">{cp.exercise.name}</div>
                              <div className="mapCheckpointLineSub">
                                {pos ? `${formatDistance(pos.distanceFromStart)} from start` : `Checkpoint ${idx + 1}`}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {/* Action Buttons */}
                <form onSubmit={handleSubmit}>
                  <div className="action-buttons-abstract">
                    {routes.length > 0 ? (
                      <>
                        <button className="btn-abstract btn-primary" type="button" onClick={handleStartNavigation}>Start Walk</button>
                        <button className="btn-abstract btn-secondary" type="submit" disabled={loading}>{loading ? "..." : "Refresh"}</button>
                      </>
                    ) : (
                      <>
                      <button className="btn-abstract btn-primary" type="submit" disabled={loading}>{loading ? "Finding..." : "Find Routes"}</button>
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