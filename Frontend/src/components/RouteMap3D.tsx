import React, { useEffect, useRef, useState } from 'react';
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

  const [is3D, setIs3D] = useState<boolean>(true);

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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
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

      // Draw Route Polyline
      const routeLine = L.polyline(latLngs, {
        color: '#0D9488',
        weight: 5,
        opacity: 0.85,
        dashArray: '10, 10',
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
              box-shadow: 0 8px 20px -3px rgba(15, 23, 42, 0.4);
              font-family: system-ui, sans-serif;
              font-size: 11px;
              font-weight: 800;
              cursor: pointer;
              white-space: nowrap;
              transition: all 0.25s ease;
              transform: ${isSelected ? 'scale(1.2) translateY(-4px)' : 'scale(1.0)'};
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
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
      }
    }
  }, [slots, selectedSlotIndex, onSelectSlot]);

  return (
    <div className="relative w-full h-[540px] sm:h-[620px] rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(13,148,136,0.25)] border border-slate-200/80 bg-slate-900 group">
      {/* Top Floating Info Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200/80 text-xs font-bold text-slate-900">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488] animate-ping" />
        <span>Rute Spasial AI &bull; {regencyName}</span>
      </div>

      {/* Top 3D / 2D Perspective Mode Switcher */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-slate-200/80">
        <button
          type="button"
          onClick={() => setIs3D(true)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            is3D
              ? 'bg-[#0D9488] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>📐 3D Miring</span>
        </button>
        <button
          type="button"
          onClick={() => setIs3D(false)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            !is3D
              ? 'bg-[#0D9488] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🗺️ 2D Datar</span>
        </button>
      </div>

      {/* 3D Tilted Perspective Canvas Wrapper */}
      <div
        className={`w-full h-full transition-all duration-700 ease-out origin-center ${
          is3D
            ? 'scale-105 [transform:perspective(1100px)_rotateX(26deg)_rotateZ(-2deg)] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)]'
            : 'scale-100 [transform:none]'
        }`}
      >
        <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden" />
      </div>

      {/* Bottom Route Legend Helper */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 p-3 rounded-2xl text-white text-xs flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="w-3 h-1 bg-[#0D9488] rounded-full inline-block" />
            <span className="text-[11px] text-slate-300">Garis Rute Perjalanan (1 → 2 → 3)</span>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Klik Pin Rute untuk Fokus Slot</span>
      </div>
    </div>
  );
};
