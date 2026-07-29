import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

  const fitBoundsToSlots = () => {
    const map = leafletMapRef.current;
    if (!map) return;

    const validSlots = slots.filter(
      (s) => s.coords && Array.isArray(s.coords) && s.coords.length === 2 && !isNaN(s.coords[0]) && !isNaN(s.coords[1])
    );

    if (validSlots.length > 0) {
      const bounds = L.latLngBounds(validSlots.map((s) => s.coords));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Check if Leaflet map container is attached
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

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);
      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Invalidate size to ensure clean canvas sizing
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 300);

    // Clear old markers & polyline
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const validSlots = slots.filter(
      (s) => s.coords && Array.isArray(s.coords) && s.coords.length === 2 && !isNaN(s.coords[0]) && !isNaN(s.coords[1])
    );

    if (validSlots.length > 0) {
      const latLngs: [number, number][] = validSlots.map((s) => s.coords);
      const bounds = L.latLngBounds(latLngs);

      // Draw Polyline Route Line
      const routeLine = L.polyline(latLngs, {
        color: '#0D9488',
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      polylineRef.current = routeLine;

      // Add Numbered Waypoint Markers (1, 2, 3, 4...)
      validSlots.forEach((slot, index) => {
        const isSelected = selectedSlotIndex === index;
        const waypointNumber = index + 1;

        const customIcon = L.divIcon({
          className: 'custom-route-waypoint-pin',
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 6px;
              background: ${isSelected ? '#0D9488' : '#0F172A'};
              color: #FFFFFF;
              padding: 5px 12px;
              border-radius: 9999px;
              border: 2px solid ${isSelected ? '#F59E0B' : '#0D9488'};
              box-shadow: 0 8px 20px -3px rgba(15, 23, 42, 0.3);
              font-family: system-ui, sans-serif;
              font-size: 11px;
              font-weight: 800;
              cursor: pointer;
              white-space: nowrap;
              transition: all 0.2s ease;
              transform: ${isSelected ? 'scale(1.15) translateY(-2px)' : 'scale(1.0)'};
              z-index: ${isSelected ? '9999' : '100'};
            ">
              <span style="
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #F59E0B;
                color: #0F172A;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: 900;
              ">${waypointNumber}</span>
              <span>${slot.activityTitle.length > 20 ? slot.activityTitle.slice(0, 20) + '...' : slot.activityTitle}</span>
            </div>
          `,
          iconSize: [140, 32],
          iconAnchor: [70, 16],
        });

        const marker = L.marker(slot.coords, { icon: customIcon }).addTo(map);

        marker.on('click', () => {
          onSelectSlot(index);
          map.panTo(slot.coords, { animate: true });
        });

        markersRef.current.push(marker);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [slots, selectedSlotIndex, onSelectSlot]);

  return (
    <div className="relative w-full h-[500px] sm:h-[580px] rounded-[32px] overflow-hidden shadow-2xl border border-slate-200/80 bg-white">
      {/* Floating Header Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-bold text-slate-900">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488] animate-ping" />
        <span>Rute Spasial Interaktif &bull; {regencyName}</span>
      </div>

      {/* Reset Fit Bounds Button */}
      <button
        type="button"
        onClick={fitBoundsToSlots}
        className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-extrabold text-slate-700 hover:text-[#0D9488] transition-all flex items-center gap-1.5 active:scale-95"
      >
        <span>🔍 Fit Rute</span>
      </button>

      {/* Map Canvas Container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Bottom Route Legend Helper */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 p-3 rounded-2xl text-white text-xs flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2 font-semibold">
          <span className="w-3 h-1 bg-[#0D9488] rounded-full inline-block" />
          <span className="text-[11px] text-slate-200">Garis Rute Perjalanan (1 → 2 → 3)</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Klik Pin Rute untuk Fokus Slot</span>
      </div>
    </div>
  );
};
