"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link, getCategoryGroup } from "@/app/types";

// Category colors and icons
const CATEGORY_STYLES: Record<string, { color: string; icon: string }> = {
  Food: { color: "#f97316", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM9 10h6v1h-1v3h-1v-3h-2v3h-1v-3H9v-1z" }, // fork/knife
  Hotels: { color: "#8b5cf6", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-3 6h6v1H9v-1zm0 2h6v1H9v-1z" }, // bed
  Attractions: { color: "#ec4899", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 2.5l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 8l3.5-.5L12 4.5z" }, // star
  Shopping: { color: "#06b6d4", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm-2 5h4l.5 2H9.5L10 7zm-.5 3h5l.5 2h-6l.5-2zm0 3h5v1h-5v-1z" }, // bag
  Transport: { color: "#22c55e", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm-3 5h6v1h-2v2h2v1h-2v2h-2v-2H9v-1h2V8H9V7z" }, // train
  Other: { color: "#6b7280", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" }, // circle
};

function createCategoryIcon(category: string): L.DivIcon {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.Other;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="40">
      <path fill="${style.color}" stroke="#fff" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="4" fill="#fff"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
}

// Cache icons to avoid recreating them
const iconCache: Record<string, L.DivIcon> = {};

function getCategoryIcon(link: Link): L.DivIcon {
  const category = getCategoryGroup(link.types, link.category);
  if (!iconCache[category]) {
    iconCache[category] = createCategoryIcon(category);
  }
  return iconCache[category];
}

interface MapViewProps {
  links: Link[];
}

// City center coordinates
const CITY_CENTERS: Record<string, [number, number]> = {
  Tokyo: [35.6762, 139.6503],
  Osaka: [34.6937, 135.5023],
  Kyoto: [35.0116, 135.7681],
  Nara: [34.6851, 135.8048],
  Hiroshima: [34.3853, 132.4553],
  Fukuoka: [33.5904, 130.4017],
  Sapporo: [43.0618, 141.3545],
  Yokohama: [35.4437, 139.6380],
  Nagoya: [35.1815, 136.9066],
  Kobe: [34.6901, 135.1956],
  Sendai: [38.2682, 140.8694],
  Kanazawa: [36.5613, 136.6562],
  Nikko: [36.7198, 139.6982],
  Hakone: [35.2324, 139.1069],
  Kamakura: [35.3192, 139.5467],
  Takayama: [36.1461, 137.2522],
};

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function getCenter(links: Link[], linksWithCoords: Link[]): [number, number] {
  // Priority 1: Find a hotel with coordinates
  const hotel = linksWithCoords.find(
    (link) => getCategoryGroup(link.types, link.category) === "Hotels"
  );
  if (hotel && hotel.latitude && hotel.longitude) {
    return [hotel.latitude, hotel.longitude];
  }

  // Priority 2: Use city center
  const city = links[0]?.city;
  if (city && CITY_CENTERS[city]) {
    return CITY_CENTERS[city];
  }

  // Priority 3: Average of all coordinates
  const avgLat = linksWithCoords.reduce((sum, l) => sum + (l.latitude || 0), 0) / linksWithCoords.length;
  const avgLng = linksWithCoords.reduce((sum, l) => sum + (l.longitude || 0), 0) / linksWithCoords.length;
  return [avgLat, avgLng];
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    if (map && map.getContainer()) {
      map.setView(center, map.getZoom());
    }
  }, [map, center]);
  
  return null;
}

export default function MapView({ links }: MapViewProps) {
  const isMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Filter links that have coordinates
  const linksWithCoords = links.filter(
    (link) => link.latitude && link.longitude
  );

  if (linksWithCoords.length === 0) {
    return (
      <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
        No locations with coordinates found
      </div>
    );
  }

  const center = getCenter(links, linksWithCoords);

  if (!isMounted) {
    return (
      <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
        Loading map...
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <MapUpdater center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {linksWithCoords.map((link) => (
          <Marker
            key={link.id}
            position={[link.latitude!, link.longitude!]}
            icon={getCategoryIcon(link)}
          >
            <Popup>
              <div className="text-sm">
                <strong>{link.title}</strong>
                {link.address && (
                  <p className="text-xs text-gray-600 mt-1">{link.address}</p>
                )}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 block"
                >
                  Open in Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
