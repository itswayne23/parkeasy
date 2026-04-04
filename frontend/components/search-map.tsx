"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { LngLatBounds, type StyleSpecification } from "maplibre-gl";

import type { ListingCard } from "@/lib/types";

const DEFAULT_CENTER: [number, number] = [91.751, 26.1824];
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm"
    }
  ]
};

type SearchMapProps = {
  listings: ListingCard[];
};

function buildBounds(listings: ListingCard[]) {
  const bounds = new LngLatBounds();
  listings.forEach((listing) => {
    bounds.extend([listing.longitude, listing.latitude]);
  });
  return bounds;
}

function toPercent(value: number, min: number, max: number) {
  if (min === max) return 50;
  return 14 + ((value - min) / (max - min)) * 72;
}

export function SearchMap({ listings }: SearchMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const providerLabel = mapTilerKey ? "MapTiler" : "OpenStreetMap";

  const points = useMemo(
    () => listings.filter((listing) => Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude)),
    [listings]
  );

  const fallbackPins = useMemo(() => {
    if (points.length === 0) return [];

    const latitudes = points.map((listing) => listing.latitude);
    const longitudes = points.map((listing) => listing.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return points.map((listing) => ({
      ...listing,
      left: `${toPercent(listing.longitude, minLng, maxLng)}%`,
      top: `${100 - toPercent(listing.latitude, minLat, maxLat)}%`
    }));
  }, [points]);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) {
      return undefined;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapTilerKey
        ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`
        : OSM_STYLE,
      center: DEFAULT_CENTER,
      zoom: 12.5,
      attributionControl: { compact: true }
    });

    map.on("load", () => {
      const bounds = buildBounds(points);

      points.forEach((listing) => {
        const markerNode = document.createElement("button");
        markerNode.type = "button";
        markerNode.className = "map-marker";
        markerNode.setAttribute("aria-label", `${listing.title}, Rs ${listing.hourlyRate} per hour`);
        markerNode.innerHTML = `<span>Rs ${listing.hourlyRate}</span>`;

        const popup = new maplibregl.Popup({
          closeButton: false,
          offset: 20
        }).setHTML(`
          <div class="map-popup">
            <strong>${listing.title}</strong>
            <span>${listing.address}</span>
            <span>Rs ${listing.hourlyRate}/hour</span>
          </div>
        `);

        new maplibregl.Marker({ element: markerNode, anchor: "bottom" })
          .setLngLat([listing.longitude, listing.latitude])
          .setPopup(popup)
          .addTo(map);
      });

      if (points.length === 1) {
        map.setCenter([points[0].longitude, points[0].latitude]);
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
      }

      setMapReady(true);
    });

    return () => {
      map.remove();
      setMapReady(false);
    };
  }, [mapTilerKey, points]);

  if (!points.length) {
    return (
      <article className="map-surface map-surface-fallback">
        <div className="map-banner">
          <strong>Listing preview</strong>
          <span>No mappable listings are available yet.</span>
        </div>
        {fallbackPins.map((listing) => (
          <div className="map-pin" style={{ left: listing.left, top: listing.top }} key={listing.id}>
            <strong>Rs {listing.hourlyRate}</strong>
            <span className="subtle">{listing.address}</span>
          </div>
        ))}
      </article>
    );
  }

  return (
    <article className="map-surface map-surface-live">
      <div className="map-banner">
        <strong>{mapReady ? `Live ${providerLabel} view` : "Loading map"}</strong>
        <span>Listings are placed from backend coordinates instead of hardcoded positions.</span>
      </div>
      <div className="map-canvas" ref={containerRef} />
    </article>
  );
}

