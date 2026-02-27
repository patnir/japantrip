import { Redis } from "@upstash/redis";
import * as fs from "fs";
import * as path from "path";

interface Link {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string | null;
  category: string | null;
  types: string[];
  address: string | null;
  city: string | null;
  rating: number | null;
  reviewCount: number | null;
  priceLevel: string | null;
  createdAt: string;
  deleted?: boolean;
  starred?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

// Load env vars from .env file
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const LINKS_KEY = "links";

async function fetchMetadata(url: string): Promise<{ latitude: number | null; longitude: number | null } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("No GOOGLE_PLACES_API_KEY found");
    return null;
  }

  // Extract coordinates from URL first
  let latitude: number | null = null;
  let longitude: number | null = null;
  
  const coordsMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (coordsMatch) {
    latitude = parseFloat(coordsMatch[1]);
    longitude = parseFloat(coordsMatch[2]);
  }

  // If we got coords from URL, use them
  if (latitude && longitude) {
    return { latitude, longitude };
  }

  // Otherwise try to resolve short links and extract coords
  let resolvedUrl = url;
  if (url.includes("goo.gl") || url.includes("maps.app.goo.gl")) {
    try {
      const response = await fetch(url, { method: "HEAD", redirect: "follow" });
      resolvedUrl = response.url;
      
      const newCoordsMatch = resolvedUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (newCoordsMatch) {
        latitude = parseFloat(newCoordsMatch[1]);
        longitude = parseFloat(newCoordsMatch[2]);
        return { latitude, longitude };
      }
    } catch (e) {
      console.log("  Could not resolve short URL");
    }
  }

  // Try to extract place name and search via API
  let placeName: string | null = null;
  
  // Extract from /place/Name/ format
  const placeMatch = resolvedUrl.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  }

  // Try ?q= parameter
  if (!placeName) {
    const qMatch = resolvedUrl.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      placeName = decodeURIComponent(qMatch[1].replace(/\+/g, " ")).split(",")[0].trim();
    }
  }

  if (placeName) {
    try {
      const searchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.location",
        },
        body: JSON.stringify({
          textQuery: placeName,
          maxResultCount: 1,
        }),
      });

      if (searchResponse.ok) {
        const data = await searchResponse.json();
        if (data.places && data.places.length > 0 && data.places[0].location) {
          return {
            latitude: data.places[0].location.latitude,
            longitude: data.places[0].location.longitude,
          };
        }
      }
    } catch (e) {
      console.log("  Places API error:", e);
    }
  }

  return null;
}

async function backfillCoordinates() {
  console.log("Reading links from Redis...");
  const links = await redis.get<Link[]>(LINKS_KEY);
  
  if (!links || links.length === 0) {
    console.log("No links found");
    return;
  }

  console.log(`Found ${links.length} links`);
  
  let updated = 0;
  for (const link of links) {
    // Skip if already has coordinates
    if (link.latitude && link.longitude) {
      console.log(`[SKIP] ${link.title} - already has coords`);
      continue;
    }

    console.log(`[FETCH] ${link.title}...`);
    const coords = await fetchMetadata(link.url);
    
    if (coords && coords.latitude && coords.longitude) {
      link.latitude = coords.latitude;
      link.longitude = coords.longitude;
      updated++;
      console.log(`  -> Got coords: ${coords.latitude}, ${coords.longitude}`);
    } else {
      console.log(`  -> No coords found`);
    }

    // Rate limit - wait 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (updated > 0) {
    console.log(`\nSaving ${updated} updated links to Redis...`);
    await redis.set(LINKS_KEY, links);
    console.log("Done!");
  } else {
    console.log("\nNo links needed updating");
  }
}

backfillCoordinates().catch(console.error);
