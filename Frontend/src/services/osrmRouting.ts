/**
 * OSRM (Open Source Routing Machine) Client for Real Road Geometry & Accurate Travel Time
 * Free public routing engine, falls back to haversine straight-line if unavailable.
 */

export interface RouteGeometrySegment {
  coordinates: [number, number][]; // [lat, lng] array following actual roads
  distanceKm: number;
  durationMinutes: number;
}

export interface FullRouteResult {
  fullGeometry: [number, number][];
  segments: RouteGeometrySegment[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  isRealRoad: boolean;
}

/**
 * Fetch real driving route between a sequence of waypoints [lat, lng]
 */
export async function fetchRealRoadRoute(
  waypoints: [number, number][],
): Promise<FullRouteResult> {
  if (waypoints.length < 2) {
    return {
      fullGeometry: waypoints,
      segments: [],
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      isRealRoad: false,
    };
  }

  // Format OSRM: lon,lat;lon,lat;...
  const coordsParam = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson&steps=false&annotations=distance,duration`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500); // 4.5s max

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`OSRM status ${res.status}`);
    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      // GeoJSON coordinates come as [lng, lat], convert to Leaflet [lat, lng]
      const fullGeometry: [number, number][] = primaryRoute.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng],
      );

      // Extract legs for each stop-to-stop segment
      const segments: RouteGeometrySegment[] = (primaryRoute.legs || []).map((leg: any) => ({
        coordinates: (leg.steps || []).length > 0
          ? leg.steps.flatMap((s: any) => s.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]))
          : [],
        distanceKm: Math.round((leg.distance / 1000) * 10) / 10,
        durationMinutes: Math.max(1, Math.round(leg.duration / 60)),
      }));

      const totalKm = Math.round((primaryRoute.distance / 1000) * 10) / 10;
      const totalMin = Math.round(primaryRoute.duration / 60);

      return {
        fullGeometry,
        segments,
        totalDistanceKm: totalKm,
        totalDurationMinutes: totalMin,
        isRealRoad: true,
      };
    }
  } catch (err) {
    // Graceful offline fallback: calculate haversine distances
  }

  // Fallback: Haversine straight segments
  let totalKm = 0;
  const segments: RouteGeometrySegment[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const km = haversineDistance(a, b);
    totalKm += km;
    segments.push({
      coordinates: [a, b],
      distanceKm: Math.round(km * 10) / 10,
      durationMinutes: Math.round((km / 40) * 60),
    });
  }

  return {
    fullGeometry: waypoints,
    segments,
    totalDistanceKm: Math.round(totalKm * 10) / 10,
    totalDurationMinutes: Math.round((totalKm / 40) * 60),
    isRealRoad: false,
  };
}

function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const [lat1, lon1] = a.map((x) => (x * Math.PI) / 180);
  const [lat2, lon2] = b.map((x) => (x * Math.PI) / 180);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
