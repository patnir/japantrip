import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Check if it's a Google Maps link
    if (isGoogleMapsUrl(url)) {
      const mapsResult = await handleGoogleMapsLink(url);
      if (mapsResult) {
        return NextResponse.json(mapsResult);
      }
    }

    // Fallback: fetch Open Graph metadata for non-Maps links
    return NextResponse.json(await fetchOpenGraphMetadata(url));
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

function isGoogleMapsUrl(url: string): boolean {
  return (
    url.includes("maps.app.goo.gl") ||
    url.includes("goo.gl/maps") ||
    url.includes("google.com/maps") ||
    url.includes("maps.google.com")
  );
}

async function handleGoogleMapsLink(url: string): Promise<PlaceMetadata | null> {
  try {
    let placeName: string | null = null;
    let placeId: string | null = null;

    // If it's a short link, resolve it first
    if (url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps")) {
      const headResponse = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
      });
      
      const locationHeader = headResponse.headers.get("location");
      if (locationHeader) {
        url = locationHeader;
      }
    }

    console.log("[Maps] Resolved URL:", url);

    // Try to extract Place ID from URL
    // Format 1: /place/.../@.../data=...!1s0x...:0x...!... (the hex after 0x is the place ID encoded)
    // Format 2: /place/.../@.../data=...!3m1!4b1!4m6!3m5!1s<PLACE_ID>!...
    // The place ID often appears after "!1s" or as a ChIJ... string
    const placeIdMatch = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)|!1s(ChIJ[A-Za-z0-9_-]+)/);
    if (placeIdMatch) {
      placeId = placeIdMatch[1] || placeIdMatch[2];
      console.log("[Maps] Extracted Place ID:", placeId);
    }

    // Extract place name from URL: /maps/place/Place+Name/...
    const placeMatch = url.match(/\/maps\/place\/([^\/]+)/);
    if (placeMatch) {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      console.log("[Maps] Extracted place name:", placeName);
    }

    if (!placeName && !placeId) {
      return null;
    }

    // Get details from Google Places API
    // If we have a place ID, use it for more accurate results
    const placeDetails = await fetchPlaceDetails(placeName, placeId);
    if (placeDetails) {
      return placeDetails;
    }

    // Fallback to just the name
    return {
      title: placeName || "Unknown Place",
      description: "",
      image: null,
      category: null,
      types: [],
      address: null,
      city: null,
      rating: null,
      reviewCount: null,
      priceLevel: null,
    };
  } catch (error) {
    console.error("Error handling Google Maps link:", error);
    return null;
  }
}

interface PlaceMetadata {
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
}

async function fetchPlaceDetails(placeName: string | null, placeId: string | null): Promise<PlaceMetadata | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  console.log("[Places API] API Key exists:", !!apiKey);
  
  if (!apiKey) {
    console.log("[Places API] No API key, returning null");
    return null;
  }
  
  let place = null;
  
  try {
    // If we have a place ID, fetch directly using Place Details
    if (placeId) {
      console.log("[Places API] Fetching by Place ID:", placeId);
      
      // For hex-encoded place IDs (0x...:0x...), we need to use text search with the place name
      // For ChIJ... place IDs, we can use the Place Details endpoint directly
      if (placeId.startsWith("ChIJ")) {
        const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "id,displayName,formattedAddress,types,rating,userRatingCount,photos,priceLevel,primaryType",
          },
        });
        
        console.log("[Places API] Details response status:", detailsResponse.status);
        
        if (detailsResponse.ok) {
          place = await detailsResponse.json();
          console.log("[Places API] Place details:", JSON.stringify(place, null, 2));
        }
      }
    }
    
    // Fallback to text search if no place ID or if place ID lookup failed
    if (!place && placeName) {
      console.log("[Places API] Searching for:", placeName);
      
      const searchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,places.photos,places.priceLevel,places.primaryType",
        },
        body: JSON.stringify({
          textQuery: placeName,
          maxResultCount: 1,
        }),
      });
      
      console.log("[Places API] Response status:", searchResponse.status);
      
      const searchData = await searchResponse.json();
      console.log("[Places API] Response:", JSON.stringify(searchData, null, 2));
      
      if (searchData.places && searchData.places.length > 0) {
        place = searchData.places[0];
      }
    }
    
    if (!place) {
      console.log("[Places API] No place found");
      return null;
    }
    
    // Category
    const category = formatPlaceType(place.primaryType || place.types?.[0]);
    
    // Price level
    let priceLevel: string | null = null;
    if (place.priceLevel) {
      const priceMap: Record<string, string> = {
        PRICE_LEVEL_FREE: "Free",
        PRICE_LEVEL_INEXPENSIVE: "$",
        PRICE_LEVEL_MODERATE: "$$",
        PRICE_LEVEL_EXPENSIVE: "$$$",
        PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
      };
      priceLevel = priceMap[place.priceLevel] || null;
    }
    
    // Photo
    let imageUrl: string | null = null;
    if (place.photos && place.photos.length > 0) {
      imageUrl = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxWidthPx=400&key=${apiKey}`;
    }
    
    // Extract city from address
    const city = extractCity(place.formattedAddress);
    
    return {
      title: place.displayName?.text || placeName,
      description: "",
      image: imageUrl,
      category,
      types: place.types || [],
      address: place.formattedAddress || null,
      city,
      rating: place.rating || null,
      reviewCount: place.userRatingCount || null,
      priceLevel,
    };
  } catch (error) {
    console.error("Places API error:", error);
    return null;
  }
}

function extractCity(address: string | undefined): string | null {
  if (!address) return null;
  
  // Japanese addresses often have city names like "Osaka", "Tokyo", "Kyoto", "Nara"
  // Try to find common Japanese city names
  const japaneseCities = [
    "Tokyo", "Osaka", "Kyoto", "Nara", "Hiroshima", "Fukuoka", "Sapporo", 
    "Yokohama", "Nagoya", "Kobe", "Sendai", "Kanazawa", "Nikko", "Hakone",
    "Kamakura", "Takayama", "Shirakawa", "Miyajima", "Naoshima"
  ];
  
  for (const city of japaneseCities) {
    if (address.includes(city)) {
      return city;
    }
  }
  
  // Fallback: try to extract from address parts
  // Japanese addresses often have format: "Japan, 〒XXX-XXXX City, Ward, ..."
  const parts = address.split(",").map(p => p.trim());
  for (const part of parts) {
    // Look for parts that might be city names (not postal codes, not "Japan")
    if (part && !part.includes("〒") && part !== "Japan" && !part.match(/^\d/)) {
      // Return the first meaningful part after Japan/postal code
      const cleanPart = part.replace(/^(Osaka|Tokyo|Kyoto|Nara)\s+/, "$1");
      if (japaneseCities.some(c => cleanPart.includes(c))) {
        return japaneseCities.find(c => cleanPart.includes(c)) || null;
      }
    }
  }
  
  return null;
}

function formatPlaceType(type: string | undefined): string | null {
  if (!type) return null;
  
  const typeMap: Record<string, string> = {
    restaurant: "Restaurant",
    cafe: "Cafe",
    bar: "Bar",
    bakery: "Bakery",
    meal_takeaway: "Takeaway",
    meal_delivery: "Delivery",
    food: "Food",
    lodging: "Hotel",
    hotel: "Hotel",
    tourist_attraction: "Attraction",
    museum: "Museum",
    park: "Park",
    shopping_mall: "Shopping Mall",
    store: "Store",
    subway_station: "Subway Station",
    train_station: "Train Station",
    transit_station: "Transit Station",
    airport: "Airport",
    temple: "Temple",
    shrine: "Shrine",
    church: "Church",
    spa: "Spa",
    gym: "Gym",
    night_club: "Night Club",
    amusement_park: "Amusement Park",
    aquarium: "Aquarium",
    zoo: "Zoo",
    art_gallery: "Art Gallery",
    japanese_restaurant: "Japanese Restaurant",
    sushi_restaurant: "Sushi Restaurant",
    ramen_restaurant: "Ramen Restaurant",
    izakaya: "Izakaya",
  };
  
  return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchOpenGraphMetadata(url: string): Promise<{ title: string; description: string; image: string | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return { title: url, description: "", image: null };
    }

    const html = await response.text();
    const finalUrl = response.url;

    const title = extractMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      extractTitle(html) ||
      url;

    const description = extractMeta(html, "og:description") ||
      extractMeta(html, "twitter:description") ||
      extractMeta(html, "description") ||
      "";

    let image = extractMeta(html, "og:image") || extractMeta(html, "twitter:image") || null;
    
    // Make relative URLs absolute
    if (image && !image.startsWith("http")) {
      const urlObj = new URL(finalUrl);
      image = image.startsWith("/") ? `${urlObj.origin}${image}` : `${urlObj.origin}/${image}`;
    }

    return { title: title.trim(), description: description.trim(), image };
  } catch {
    return { title: url, description: "", image: null };
  }
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, "i"),
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1] : null;
}
