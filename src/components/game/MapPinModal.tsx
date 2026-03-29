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
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapContainer.current || !token) return;

    let cancelled = false;

    import("mapbox-gl").then((mod) => {
      if (cancelled || !mapContainer.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapboxgl = (mod as any).default ?? mod;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [cardLon, cardLat],
        zoom: 13,
      });
      mapRef.current = map;

      map.on("click", (e: { lngLat: { lat: number; lng: number } }) => {
        const { lng, lat } = e.lngLat;
        setPin({ lat, lon: lng });

        if (markerRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (markerRef.current as any).setLngLat([lng, lat]);
        } else {
          const el = document.createElement("div");
          el.style.cssText =
            "width:32px;height:32px;border-radius:50%;background:#f59e0b;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;";
          el.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
          markerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);
        }
      });
    });

    return () => {
      cancelled = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (markerRef.current as any)?.remove();
      markerRef.current = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapRef.current as any)?.remove();
      mapRef.current = null;
    };
  }, [cardLat, cardLon]);

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
      <div ref={mapContainer} className="flex-1 w-full" />

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10 shrink-0">
        {pin && distance !== null ? (
          <button
            onClick={() => onConfirm(pin.lat, pin.lon, distance)}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            Conferma posizione
          </button>
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
