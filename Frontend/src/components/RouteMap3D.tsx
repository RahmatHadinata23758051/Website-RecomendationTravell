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

      // Add Clean Numbered Teardrop Pins (1, 2, 3, 4...)
      validSlots.forEach((slot, index) => {
        const isSelected = selectedSlotIndex === index;
        const waypointNumber = index + 1;

        const customIcon = L.divIcon({
          className: 'custom-route-waypoint-pin-clean',
          html: `
            <div style="
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: center;
              cursor: pointer;
              transform: ${isSelected ? 'scale(1.25) translateY(-6px)' : 'scale(1.0)'};
              transition: all 0.25s ease;
              z-index: ${isSelected ? '9999' : '100'};
            ">
              <!-- Numbered Pin Head Circle -->
              <div style="
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: ${isSelected ? '#0D9488' : '#0F172A'};
                color: #FFFFFF;
                border: 3px solid ${isSelected ? '#F59E0B' : '#0D9488'};
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 13px;
                font-weight: 900;
              ">
                ${waypointNumber}
              </div>

              <!-- Teardrop Pointer -->
              <div style="
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 7px solid ${isSelected ? '#F59E0B' : '#0D9488'};
                margin-top: -2px;
              "></div>
            </div>
          `,
          iconSize: [32, 38],
          iconAnchor: [16, 38],
        });

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; padding: 2px; max-width: 180px;">
            <img src="${slot.image}" alt="${slot.activityTitle}" style="width: 100%; height: 75px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />
            <div style="font-size: 10px; font-weight: 800; color: #0D9488; text-transform: uppercase;">Stop ${waypointNumber} &bull; ${slot.time}</div>
            <div style="font-size: 12px; font-weight: 800; color: #0F172A; line-height: 1.2; margin-top: 2px;">${slot.activityTitle}</div>
          </div>
        `;

        const marker = L.marker(slot.coords, { icon: customIcon })
          .bindPopup(popupContent, { closeButton: false, offset: [0, -32] })
          .addTo(map);

        marker.on('click', () => {
          onSelectSlot(index);
          map.panTo(slot.coords, { animate: true });
          marker.openPopup();
        });

        if (isSelected) {
          marker.openPopup();
        }

        markersRef.current.push(marker);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [slots, selectedSlotIndex, onSelectSlot]);

  return (
    <div className="relative w-full h-[520px] sm:h-[580px] rounded-[28px] overflow-hidden shadow-lg border border-slate-200/90 bg-[#F8FAFC]">
      {/* Floating Header Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md border border-slate-200 text-xs font-bold text-slate-800">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
        <span>Peta Spasial Rute &bull; {regencyName}</span>
      </div>

      {/* Top 3D / 2D Perspective Mode Switcher & Fit Bounds */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-full shadow-md border border-slate-200">
          <button
            type="button"
            onClick={() => setIs3D(true)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              is3D ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📐 3D Miring
          </button>
          <button
            type="button"
            onClick={() => setIs3D(false)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              !is3D ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗺️ 2D Datar
          </button>
        </div>

        <button
          type="button"
          onClick={fitBoundsToSlots}
          className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#0D9488] transition-all active:scale-95"
        >
          🔍 Fit
        </button>
      </div>

      {/* Oversized Inner Container for smooth tilt without black gaps or cutoff corners */}
      <div
        className="absolute -top-[15%] -left-[15%] w-[130%] h-[130%] origin-center transition-all duration-500 ease-out bg-slate-100"
        style={{
          transform: is3D
            ? 'perspective(1200px) rotateX(24deg) scale(1.06)'
            : 'perspective(1200px) rotateX(0deg) scale(1)',
        }}
      >
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
};
