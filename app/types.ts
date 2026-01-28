export interface Link {
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
}

// Based on Google Places API types: https://developers.google.com/maps/documentation/places/web-service/place-types
export const CATEGORY_GROUPS: Record<string, string[]> = {
  "Food": [
    // Food and Drink from Google
    "restaurant", "food", "cafe", "cafeteria", "bar", "bar_and_grill", "bakery", 
    "meal_takeaway", "meal_delivery", "coffee_shop", "tea_house", "wine_bar", "pub",
    "fast_food_restaurant", "fine_dining_restaurant", "buffet_restaurant", "diner",
    "american_restaurant", "asian_restaurant", "brazilian_restaurant", "chinese_restaurant",
    "french_restaurant", "greek_restaurant", "indian_restaurant", "indonesian_restaurant",
    "italian_restaurant", "japanese_restaurant", "korean_restaurant", "lebanese_restaurant",
    "mediterranean_restaurant", "mexican_restaurant", "middle_eastern_restaurant",
    "pizza_restaurant", "ramen_restaurant", "seafood_restaurant", "spanish_restaurant",
    "steak_house", "sushi_restaurant", "thai_restaurant", "turkish_restaurant",
    "vegan_restaurant", "vegetarian_restaurant", "vietnamese_restaurant",
    "breakfast_restaurant", "brunch_restaurant", "dessert_restaurant", "hamburger_restaurant",
    "ice_cream_shop", "juice_shop", "sandwich_shop", "acai_shop", "afghani_restaurant",
    "african_restaurant", "bagel_shop", "barbecue_restaurant", "candy_store", "cat_cafe",
    "chocolate_factory", "chocolate_shop", "confectionery", "deli", "dessert_shop",
    "dog_cafe", "donut_shop", "food_court",
  ],
  "Hotels": [
    // Lodging from Google
    "lodging", "hotel", "motel", "hostel", "resort_hotel", "bed_and_breakfast",
    "campground", "camping_cabin", "cottage", "extended_stay_hotel", "farmstay",
    "guest_house", "inn", "japanese_inn", "budget_japanese_inn", "mobile_home_park",
    "private_guest_room", "rv_park",
  ],
  "Attractions": [
    // Entertainment and Recreation + Culture + Places of Worship from Google
    "tourist_attraction", "museum", "park", "amusement_park", "aquarium", "zoo",
    "art_gallery", "place_of_worship", "church", "hindu_temple", "mosque", "synagogue",
    "national_park", "state_park", "botanical_garden", "garden", "marina", "movie_theater",
    "night_club", "performing_arts_theater", "stadium", "theme_park", "water_park",
    "historical_landmark", "historical_place", "cultural_landmark", "monument", "sculpture",
    "amphitheatre", "amusement_center", "banquet_hall", "bowling_alley", "casino",
    "comedy_club", "community_center", "concert_hall", "convention_center", "cultural_center",
    "dance_hall", "dog_park", "event_venue", "ferris_wheel", "hiking_area", "internet_cafe",
    "karaoke", "observation_deck", "opera_house", "philharmonic_hall", "picnic_ground",
    "planetarium", "plaza", "roller_coaster", "skateboard_park", "video_arcade",
    "visitor_center", "wedding_venue", "wildlife_park", "wildlife_refuge", "beach",
    "spa", "fitness_center", "gym", "swimming_pool", "golf_course", "ski_resort",
  ],
  "Shopping": [
    // Shopping from Google
    "shopping_mall", "store", "clothing_store", "department_store", "convenience_store",
    "supermarket", "grocery_store", "market", "book_store", "electronics_store",
    "furniture_store", "gift_shop", "hardware_store", "home_goods_store", "home_improvement_store",
    "jewelry_store", "liquor_store", "pet_store", "shoe_store", "sporting_goods_store",
    "asian_grocery_store", "auto_parts_store", "bicycle_store", "butcher_shop",
    "cell_phone_store", "discount_store", "food_store", "warehouse_store", "wholesaler",
  ],
  "Transport": [
    // Transportation from Google
    "transit_station", "airport", "international_airport", "train_station", "subway_station",
    "bus_station", "bus_stop", "ferry_terminal", "light_rail_station", "taxi_stand",
    "heliport", "airstrip", "park_and_ride", "transit_depot", "truck_stop",
  ],
};

export function getCategoryGroup(types: string[] | null, category: string | null): string {
  // First check the types array from Google (most reliable)
  if (types && types.length > 0) {
    for (const [group, groupTypes] of Object.entries(CATEGORY_GROUPS)) {
      for (const type of types) {
        if (groupTypes.includes(type)) {
          return group;
        }
      }
    }
  }
  
  // Fallback to category string
  if (category) {
    const lowerCategory = category.toLowerCase().replace(/ /g, "_");
    for (const [group, groupTypes] of Object.entries(CATEGORY_GROUPS)) {
      if (groupTypes.includes(lowerCategory)) {
        return group;
      }
    }
  }
  
  return "Other";
}
