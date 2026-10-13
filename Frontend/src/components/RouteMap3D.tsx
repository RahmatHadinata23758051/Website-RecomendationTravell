import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Layers, Maximize2, Car, Route as RouteIcon } from 'lucide-react';
import { fetchRealRoadRoute, FullRouteResult } from '../services/osrmRouting';

export interface RouteSlot {
  time: string;
  activityTitle: string;
  category: string;
  location: string;
  estimatedCost: string;
  coords: [number, number];
  image: string;
  aiTip?: string;
  travelTime?: string;
}

interface RouteMap3DProps {
  slots: RouteSlot[];
  selectedSlotIndex: number | null;
  onSelectSlot: (index: number) => void;
  regencyName: string;
}

// Jitter offset untuk marker yang koordinatnya terlalu dekat / identik
const applyJitter = (coords: [number, number][], minDist = 0.0008): [number, number][] => {
  const result = [...coords];
  const n = result.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [lat1, lng1] = result[i];
      const [lat2, lng2] = result[j];
      const dist = Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2);
      if (dist < minDist) {
        const angle = Math.atan2(lng2 - lng1, lat2 - lat1);
        result[j] = [
          lat2 + Math.cos(angle) * minDist * 1.5,
          lng2 + Math.sin(angle) * minDist * 1.5,
        ];
      }
    }
  }
  return result;
};

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} j ${m} min` : `${h} jam`;
};

const categoryColors: Record<string, { bg: string; text: string; ring: string }> = {
  Pantai: { bg: '#0ea5e9', text: '#fff', ring: '#38bdf8' },
  Alam: { bg: '#22c55e', text: '#fff', ring: '#4ade80' },
  Budaya: { bg: '#f59e0b', text: '#fff', ring: '#fbbf24' },
  Kuliner: { bg: '#ef4444', text: '#fff', ring: '#f87171' },
  Adventure: { bg: '#8b5cf6', text: '#fff', ring: '#a78bfa' },
  default: { bg: '#0D9488', text: '#fff', ring: '#2DD4BF' },
};

const getCatColor = (cat: string) => categoryColors[cat] || categoryColors.default;

export const RouteMap3D: React.FC<RouteMap3DProps> = ({
  slots,
  selectedSlotIndex,
  onSelectSlot,
  regencyName,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const distanceLabelsRef = useRef<L.Marker[]>([]);

  const [activeLayer, setActiveLayer] = useState<'street' | 'satellite'>('street');
  const [showDistanceLabels, setShowDistanceLabels] = useState(true);
  const [routeResult, setRouteResult] = useState<FullRouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const fitBoundsToSlots = () => {
    const map = leafletMapRef.current;
    if (!map) return;

    const validSlots = slots.filter(
      (s) => s.coords && Array.isArray(s.coords) && s.coords.length === 2 && !isNaN(s.coords[0]) && !isNaN(s.coords[1])
    );

    if (validSlots.length > 0) {
      const bounds = L.latLngBounds(validSlots.map((s) => s.coords));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  };

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapRef.current) return;

    if (leafletMapRef.current) {
      const container = leafletMapRef.current.getContainer();
      if (container !== mapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    }

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, {
        center: [-5.35, 105.1],
        zoom: 10,
        zoomControl: false,
      });

      const streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      });

      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri',
        maxZoom: 19,
      });

      streetLayer.addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);
      leafletMapRef.current = map;

      (map as any)._streetLayer = streetLayer;
      (map as any)._satelliteLayer = satelliteLayer;
    }
  }, []);

  // Fetch real road route from OSRM whenever valid slots change
  useEffect(() => {
    let cancelled = false;
    const validSlots = slots.filter(
      (s) => s.coords && Array.isArray(s.coords) && s.coords.length === 2 && !isNaN(s.coords[0]) && !isNaN(s.coords[1])
    );
    if (validSlots.length < 2) {
      setRouteResult(null);
      return;
    }
    const originalCoords = validSlots.map((s) => s.coords);
    setIsLoadingRoute(true);
    fetchRealRoadRoute(originalCoords).then((result) => {
      if (!cancelled) {
        setRouteResult(result);
        setIsLoadingRoute(false);
      }
    }).catch(() => {
      if (!cancelled) setIsLoadingRoute(false);
    });
    return () => { cancelled = true; };
  }, [slots]);

  // Update Markers, Polyline & Distance Labels
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    setTimeout(() => map.invalidateSize(), 100);

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    distanceLabelsRef.current.forEach((m) => m.remove());
    distanceLabelsRef.current = [];

    const validSlots = slots.filter(
      (s) => s.coords && Array.isArray(s.coords) && s.coords.length === 2 && !isNaN(s.coords[0]) && !isNaN(s.coords[1])
    );

    if (validSlots.length === 0) return;

    const originalCoords = validSlots.map((s) => s.coords);
    const jitteredCoords = applyJitter(originalCoords);

    // Draw Polyline (real road geometry if available from OSRM, else fallback)
    const geometry = routeResult?.fullGeometry?.length ? routeResult.fullGeometry : originalCoords;
    const isReal = Boolean(routeResult?.isRealRoad);
    const routeLine = L.polyline(geometry, {
      color: '#0D9488',
      weight: isReal ? 5 : 4,
      opacity: 0.9,
      dashArray: isReal ? undefined : '10, 6', // Solid line for real roads, dashed for haversine
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    polylineRef.current = routeLine;

    // Add Distance Labels on each segment
    if (showDistanceLabels && routeResult?.segments && routeResult.segments.length > 0) {
      routeResult.segments.forEach((seg, i) => {
        const segPoints = seg.coordinates.length > 0 ? seg.coordinates : [originalCoords[i], originalCoords[i + 1]];
        const midIdx = Math.floor(segPoints.length / 2);
        const midPoint = segPoints[midIdx] || segPoints[0];
        const label = `${formatMinutes(seg.durationMinutes)} · ${seg.distanceKm.toFixed(1)} km`;

        const labelIcon = L.divIcon({
          className: 'route-distance-label',
          html: `
            <div style="
              background: rgba(13, 148, 136, 0.95);
              color: white;
              padding: 2px 7px;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 800;
              font-family: system-ui, sans-serif;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(13, 148, 136, 0.35);
              border: 1px solid rgba(255,255,255,0.3);
              backdrop-filter: blur(4px);
            ">
              ${label}
            </div>
          `,
          iconSize: [80, 20],
          iconAnchor: [40, 10],
        });

        const labelMarker = L.marker(midPoint, { icon: labelIcon, interactive: false }).addTo(map);
        distanceLabelsRef.current.push(labelMarker);
      });
    }

    // Add Pins with category colors
    validSlots.forEach((slot, index) => {
      const isSelected = selectedSlotIndex === index;
      const waypointNumber = index + 1;
      const catColor = getCatColor(slot.category);
      const [markerLat, markerLng] = jitteredCoords[index];

      const customIcon = L.divIcon({
        className: 'custom-route-waypoint-pin',
        html: `
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transform: ${isSelected ? 'scale(1.3) translateY(-8px)' : 'scale(1.0)'};
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: ${isSelected ? '9999' : 100 + index};
            filter: drop-shadow(0 4px 12px ${catColor.bg}60);
          ">
            <div style="
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: ${isSelected ? catColor.bg : '#0F172A'};
              color: ${isSelected ? catColor.text : '#fff'};
              border: 3px solid ${isSelected ? catColor.ring : catColor.bg};
              box-shadow: 
                0 4px 16px ${isSelected ? catColor.bg + '60' : 'rgba(15, 23, 42, 0.4)'},
                inset 0 1px 0 ${isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'};
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'JetBrains Mono', 'Fira Code', monospace;
              font-size: 13px;
              font-weight: 900;
            ">
              ${waypointNumber}
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 9px solid ${isSelected ? catColor.ring : catColor.bg};
              margin-top: -3px;
              filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15));
            "></div>
          </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
      });

      const popupContent = buildPopupContent(slot, waypointNumber, catColor);

      const marker = L.marker([markerLat, markerLng], { icon: customIcon })
        .bindPopup(popupContent, {
          closeButton: false,
          offset: [0, -36],
          className: 'custom-route-popup',
        })
        .addTo(map);

      marker.on('click', () => {
        onSelectSlot(index);
        map.flyTo([markerLat, markerLng], 15, { animate: true, duration: 1.0 });
        marker.openPopup();
      });

      markersRef.current.push(marker);
    });

    const bounds = L.latLngBounds(jitteredCoords);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [slots, regencyName, showDistanceLabels, routeResult]);

  // Smooth FlyTo animation when selectedSlotIndex changes
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || selectedSlotIndex === null) return;
    const targetSlot = slots[selectedSlotIndex];
    if (targetSlot && targetSlot.coords && !isNaN(targetSlot.coords[0])) {
      map.flyTo(targetSlot.coords, 15, { animate: true, duration: 1.0 });
      const marker = markersRef.current[selectedSlotIndex];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedSlotIndex, slots]);

  const toggleLayer = (layer: 'street' | 'satellite') => {
    const map = leafletMapRef.current;
    if (!map) return;
    setActiveLayer(layer);
    if (layer === 'street') {
      map.removeLayer((map as any)._satelliteLayer);
      (map as any)._streetLayer.addTo(map);
    } else {
      map.removeLayer((map as any)._streetLayer);
      (map as any)._satelliteLayer.addTo(map);
    }
  };

  return (
    <div className="relative w-full h-[380px] sm:h-[480px] lg:h-[560px] rounded-2xl sm:rounded-[28px] overflow-hidden shadow-xl border border-slate-200/90 bg-[#F8FAFC]">
      
      {/* Header Controls */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 z-20 flex items-center justify-between gap-1.5 sm:gap-2 pointer-events-none">
        
        {/* Left: Regency Badge + Route Summary */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-md border border-slate-200/80 text-[11px] sm:text-xs font-bold text-slate-800 truncate max-w-[130px] sm:max-w-none">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0D9488] shrink-0" />
            <span className="truncate">{regencyName}</span>
          </div>

          {routeResult && routeResult.totalDistanceKm > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-slate-200/80 text-xs font-bold text-teal-800">
              <RouteIcon className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>{routeResult.totalDistanceKm} km · ~{formatMinutes(routeResult.totalDurationMinutes)}</span>
              {routeResult.isRealRoad && (
                <span className="ml-1 text-[10px] font-extrabold uppercase bg-teal-100 text-[#0D9488] px-1.5 py-0.2 rounded">Jalan</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Layer Toggle + Distance Toggle + Recenter */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5">
          <div className="flex items-center gap-0.5 sm:gap-1 bg-white/95 backdrop-blur-md p-0.5 sm:p-1 rounded-full shadow-md border border-slate-200">
            <button
              type="button"
              onClick={() => toggleLayer('street')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                activeLayer === 'street'
                  ? 'bg-[#0D9488] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Jalan (OpenStreetMap)"
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Jalan</span>
            </button>
            <button
              type="button"
              onClick={() => toggleLayer('satellite')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                activeLayer === 'satellite'
                  ? 'bg-[#0D9488] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Satelit (ESRI)"
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ transform: 'rotate(45deg)' }} />
              <span className="hidden xs:inline">Satelit</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowDistanceLabels((p) => !p)}
            className={`p-1.5 sm:p-2 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-slate-200 transition-all active:scale-95 ${
              showDistanceLabels
                ? 'text-[#0D9488] ring-2 ring-[#0D9488]/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title={showDistanceLabels ? 'Sembunyikan estimasi perjalanan' : 'Tampilkan estimasi perjalanan'}
          >
            <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={fitBoundsToSlots}
            className="p-1.5 sm:p-2 rounded-full bg-white/95 backdrop-blur-md text-slate-700 hover:text-[#0D9488] shadow-md border border-slate-200 transition-all active:scale-95"
            title="Fokus Ulang Peta Spasial"
          >
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={mapRef} className="w-full h-full z-10" />

      {/* Subtle Legend Hint */}
      <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 z-20 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-sm bg-white/90 backdrop-blur-md rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-md border border-slate-200/80 text-[9.5px] sm:text-[10px] font-medium text-slate-600 text-center flex items-center justify-center gap-1.5 sm:gap-2">
          <span>Klik pin untuk detail</span>
          <span>&bull;</span>
          <span className="font-semibold text-teal-800">
            {isLoadingRoute ? 'Menghitung rute jalan...' : routeResult?.isRealRoad ? 'Rute jalan raya nyata' : 'Rute lurus langsung'}
          </span>
        </div>
      </div>
    </div>
  );
};

function buildPopupContent(slot: RouteSlot, waypointNumber: number, catColor: { bg: string; text: string; ring: string }): string {
  const fallbackImg = '/assets/images/heroes/hero-pahawang-bg.png';
  const safeImage = slot.image && slot.image.trim() !== '' ? slot.image : fallbackImg;
  
  return `
    <div style="
      font-family: system-ui, -apple-system, sans-serif;
      min-width: 220px;
      max-width: 280px;
      padding: 0;
      background: white;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
    ">
      <div style="
        position: relative;
        width: 100%;
        height: 120px;
        background: linear-gradient(135deg, ${catColor.bg}15, ${catColor.ring}15);
        overflow: hidden;
      ">
        <img 
          src="${safeImage}" 
          alt="${slot.activityTitle}"
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: opacity 0.2s;
          "
          onerror="this.onerror=null; this.src='${fallbackImg}'; this.style.filter='grayscale(0.3)';"
        />
        <div style="
          position: absolute;
          top: 10px;
          left: 10px;
          background: ${catColor.bg};
          color: ${catColor.text};
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          box-shadow: 0 2px 8px ${catColor.bg}50;
        ">
          ${slot.category}
        </div>
        <div style="
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(15, 23, 42, 0.85);
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 900;
          font-family: 'JetBrains Mono', monospace;
          backdrop-filter: blur(4px);
        ">
          ${waypointNumber}
        </div>
      </div>
      
      <div style="padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 8px;">
        <div style="font-size: 13px; font-weight: 800; color: #0F172A; line-height: 1.3;">
          ${slot.activityTitle}
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 10.5px; color: #475569;">
          <span style="display: flex; align-items: center; gap: 4px; background: #f1f5f9; padding: 3px 8px; border-radius: 6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${slot.location}
          </span>
          <span style="display: flex; align-items: center; gap: 4px; background: #f1f5f9; padding: 3px 8px; border-radius: 6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${slot.time}
          </span>
          ${slot.estimatedCost && slot.estimatedCost !== 'Harga belum tersedia' ? `
            <span style="display: flex; align-items: center; gap: 4px; background: #fef3c7; padding: 3px 8px; border-radius: 6px; color: #92400e;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              ${slot.estimatedCost}
            </span>
          ` : ''}
        </div>

        ${slot.travelTime ? `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 10px;
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 700;
            color: #065f46;
            width: fit-content;
          ">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8c0 2.5-2 5-4 5s-4-2.5-4-5"/><path d="M14 14V8a4 4 0 0 0-8 0v6"/><path d="M6 14h12"/></svg>
            ${slot.travelTime}
          </div>
        ` : ''}

        ${slot.aiTip ? `
          <div style="
            padding: 8px 10px;
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 10px;
            font-size: 10.5px;
            line-height: 1.4;
            color: #92400e;
            display: flex;
            gap: 6px;
            align-items: flex-start;
          ">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <span>${slot.aiTip}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
