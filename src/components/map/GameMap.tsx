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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || cards.length === 0) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapContainer.current) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const center = cards[activeCardIndex] ?? cards[0];
      const map = L.map(mapContainer.current, { zoomControl: false }).setView(
        [center.lat, center.lon],
        14
      );
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      // Route polyline
      if (cards.length > 1) {
        L.polyline(
          cards.map((c) => [c.lat, c.lon] as [number, number]),
          { color: "#6366f1", weight: 3, dashArray: "6 6" }
        ).addTo(map);
      }

      // Card markers
      cards.forEach((card, i) => {
        const isActive = i === activeCardIndex;
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${
            isActive ? "#6366f1" : "rgba(30,27,50,0.9)"
          };border:2px solid ${
            isActive ? "white" : "rgba(255,255,255,0.3)"
          };display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:${
            isActive ? "white" : "rgba(255,255,255,0.5)"
          };box-shadow:0 2px 6px rgba(0,0,0,0.5);">${i + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([card.lat, card.lon], { icon }).addTo(map);
      });

      // Player position
      if (playerPosition) {
        const playerIcon = L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([playerPosition.lat, playerPosition.lon], { icon: playerIcon }).addTo(map);
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [cards, activeCardIndex, playerPosition]);

  return (
    <div
      ref={mapContainer}
      className={`w-full rounded-2xl overflow-hidden ${className}`}
      style={{ minHeight: 200 }}
    />
  );
}
