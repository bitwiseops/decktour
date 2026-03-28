"use client";

import { useRef, useEffect } from "react";
import type { Card } from "@/lib/types";

interface GameMapProps {
  cards: Card[];
  activeCardIndex: number;
  playerPosition?: { lat: number; lon: number } | null;
  className?: string;
}

export function GameMap({ cards, activeCardIndex, playerPosition, className = "" }: GameMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapContainer.current || !token || cards.length === 0) return;

    let cancelled = false;

    import("mapbox-gl").then((mapboxgl) => {
      if (cancelled || !mapContainer.current) return;

      (mapboxgl as unknown as { accessToken: string }).accessToken = token;

      const center = cards[activeCardIndex] ?? cards[0];
      const map = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [center.lon, center.lat],
        zoom: 14,
      });
      mapRef.current = map;

      map.on("load", () => {
        // Add route line
        const coords = cards.map((c) => [c.lon, c.lat]);
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          },
        });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          paint: {
            "line-color": "#6366f1",
            "line-width": 3,
            "line-dasharray": [2, 2],
          },
        });

        // Add markers
        cards.forEach((card, i) => {
          const el = document.createElement("div");
          el.className = `w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
            i === activeCardIndex
              ? "bg-primary border-white text-white pulse-marker relative"
              : "bg-card-bg border-glass-border text-foreground/60"
          }`;
          el.textContent = String(i + 1);

          const marker = new mapboxgl.default.Marker({ element: el })
            .setLngLat([card.lon, card.lat])
            .addTo(map);
          markersRef.current.push(marker);
        });

        // Player position
        if (playerPosition) {
          const playerEl = document.createElement("div");
          playerEl.className = "w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg";
          new mapboxgl.default.Marker({ element: playerEl })
            .setLngLat([playerPosition.lon, playerPosition.lat])
            .addTo(map);
        }
      });
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [cards, activeCardIndex, playerPosition]);

  return (
    <div
      ref={mapContainer}
      className={`w-full rounded-2xl overflow-hidden ${className}`}
      style={{ minHeight: 250 }}
    />
  );
}
