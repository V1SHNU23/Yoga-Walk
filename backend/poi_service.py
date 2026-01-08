import requests
import math

# Overpass API (The standard API for querying OpenStreetMap data)
OVERPASS_URL = "http://overpass-api.de/api/interpreter"

def get_wellness_locations(user_lat, user_lon, radius_meters=3000):
    """
    Fetches specific wellness locations (Water, Views, Nature) around the user.
    Default radius is 3km to ensure we find good spots.
    """
    
    # 1. Define the Query
    # We look for nodes (points) and ways (areas) matching our 'Serenity' tags.
    query = f"""
    [out:json][timeout:25];
    (
      // 1. BLUE SPACES (Water)
      node["natural"="water"](around:{radius_meters},{user_lat},{user_lon});
      way["natural"="water"](around:{radius_meters},{user_lat},{user_lon});
      node["natural"="beach"](around:{radius_meters},{user_lat},{user_lon});
      way["waterway"="riverbank"](around:{radius_meters},{user_lat},{user_lon});
      node["leisure"="marina"](around:{radius_meters},{user_lat},{user_lon});

      // 2. SCENIC VIEWPOINTS
      node["tourism"="viewpoint"](around:{radius_meters},{user_lat},{user_lon});
      node["natural"="peak"](around:{radius_meters},{user_lat},{user_lon});

      // 3. NATURE & FOREST (Green)
      way["landuse"="forest"](around:{radius_meters},{user_lat},{user_lon});
      way["natural"="wood"](around:{radius_meters},{user_lat},{user_lon});
      way["leisure"="nature_reserve"](around:{radius_meters},{user_lat},{user_lon});
      way["leisure"="park"](around:{radius_meters},{user_lat},{user_lon});
    );
    out center;
    """

    try:
        print(f"🔎 Searching for wellness spots within {radius_meters}m...")
        response = requests.get(OVERPASS_URL, params={'data': query})
        data = response.json()
        
        places = []
        
        for element in data.get('elements', []):
            tags = element.get('tags', {})
            name = tags.get('name')
            
            # Skip unnamed places (we want named destinations)
            if not name:
                continue

            # Get Coordinates (Center of the shape or the point itself)
            lat = element.get('lat') or element.get('center', {}).get('lat')
            lon = element.get('lon') or element.get('center', {}).get('lon')
            
            if not lat or not lon:
                continue

            # Determine Type for UI Icons
            place_type = "Nature" # Default
            if "water" in tags.get("natural", "") or "beach" in tags.get("natural", "") or "waterway" in tags:
                place_type = "Water"
            elif "viewpoint" in tags.get("tourism", "") or "peak" in tags.get("natural", ""):
                place_type = "Viewpoint"
            
            # Calculate distance for sorting
            dist = haversine(user_lat, user_lon, lat, lon)
            
            places.append({
                "name": name,
                "type": place_type,
                "lat": lat,
                "lon": lon,
                "distance_km": round(dist, 2)
            })

        # Sort by distance (closest first)
        places.sort(key=lambda x: x['distance_km'])
        
        # Deduplicate by name (sometimes OSM returns multiple nodes for one park)
        unique_places = []
        seen_names = set()
        for p in places:
            if p['name'] not in seen_names:
                unique_places.append(p)
                seen_names.add(p['name'])
                
        return unique_places[:10]  # Return top 10 results

    except Exception as e:
        print(f"❌ Error fetching POIs: {e}")
        return []

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    R = 6371  # Radius of earth in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) * math.sin(dLat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) * math.sin(dLon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    d = R * c
    return d