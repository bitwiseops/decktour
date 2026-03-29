"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, MapPin, CheckCircle } from "lucide-react";
import { haversineDistance } from "@/lib/scoring";

interface MapPinModalProps {
  cardLat: number;
  cardLon: number;
  onConfirm: (lat: number, lon: number, distance: number) => void;
  onClose: () => void;
}

export function MapPinModal({ cardLat, cardLon, onConfirm, onClose }: MapPinModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapContainer.current) return;
      if (mapRef.current) return;

      const map = L.map(mapContainer.current, { zoomControl: true }).setView(
        [cardLat, cardLon],
        15
      );
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Cerchio per indicare la posizione del luogo
      L.circleMarker([cardLat, cardLon], {
        radius: 12,
        color: "#6366f1",
        fillColor: "#6366f1",
        fillOpacity: 0.25,
        weight: 2,
      }).addTo(map);

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setPin({ lat, lon: lng });

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const icon = L.divIcon({
            className: "",
            html: `<div style="width:28px;height:28px;border-radius:50%;background:#f59e0b;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        }
      });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distance = pin ? haversineDistance(pin.lat, pin.lon, cardLat, cardLon) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div>
          <h2 className="font-semibold text-sm">Segna la posizione</h2>
          <p className="text-xs text-foreground/40">Tocca la mappa per indicare dove si trova il luogo</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl glass border border-glass-border">
          <X size={18} />
        </button>
      </div>

      {/* Map */}
      <div ref={mapContainer} className="flex-1 w-full min-h-0" />

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10 shrink-0">
        {pin && distance !== null ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-center text-foreground/50">
              {distance < 1000
                ? `${Math.round(distance)}m dal luogo`
                : `${(distance / 1000).toFixed(1)}km dal luogo`}
            </p>
            <button
              onClick={() => onConfirm(pin.lat, pin.lon, distance)}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Conferma posizione
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-foreground/40">
            <MapPin size={14} />
            Tocca la mappa per piazzare un segnaposto
          </div>
        )}
      </div>
    </motion.div>
  );
}
