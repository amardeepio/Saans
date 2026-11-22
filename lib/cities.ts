import type { City, Profile } from "./types";

export const CITIES: City[] = [
  { id: "delhi", name: "Delhi", region: "NCT", country: "India", latitude: 28.6139, longitude: 77.209 },
  { id: "mumbai", name: "Mumbai", region: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777 },
  { id: "kolkata", name: "Kolkata", region: "West Bengal", country: "India", latitude: 22.5726, longitude: 88.3639 },
  { id: "bengaluru", name: "Bengaluru", region: "Karnataka", country: "India", latitude: 12.9716, longitude: 77.5946 },
  { id: "chennai", name: "Chennai", region: "Tamil Nadu", country: "India", latitude: 13.0827, longitude: 80.2707 },
  { id: "patna", name: "Patna", region: "Bihar", country: "India", latitude: 25.5941, longitude: 85.1376 },
  { id: "hyderabad", name: "Hyderabad", region: "Telangana", country: "India", latitude: 17.385, longitude: 78.4867 },
  { id: "ahmedabad", name: "Ahmedabad", region: "Gujarat", country: "India", latitude: 23.0225, longitude: 72.5714 },
  { id: "pune", name: "Pune", region: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567 },
  { id: "jaipur", name: "Jaipur", region: "Rajasthan", country: "India", latitude: 26.9124, longitude: 75.7873 },
  { id: "lucknow", name: "Lucknow", region: "Uttar Pradesh", country: "India", latitude: 26.8467, longitude: 80.9462 },
  { id: "kanpur", name: "Kanpur", region: "Uttar Pradesh", country: "India", latitude: 26.4499, longitude: 80.3319 },
  { id: "nagpur", name: "Nagpur", region: "Maharashtra", country: "India", latitude: 21.1458, longitude: 79.0882 },
  { id: "indore", name: "Indore", region: "Madhya Pradesh", country: "India", latitude: 22.7196, longitude: 75.8577 },
  { id: "bhopal", name: "Bhopal", region: "Madhya Pradesh", country: "India", latitude: 23.2599, longitude: 77.4126 },
  { id: "surat", name: "Surat", region: "Gujarat", country: "India", latitude: 21.1702, longitude: 72.8311 },
  { id: "varanasi", name: "Varanasi", region: "Uttar Pradesh", country: "India", latitude: 25.3176, longitude: 82.9739 },
  { id: "agra", name: "Agra", region: "Uttar Pradesh", country: "India", latitude: 27.1767, longitude: 78.0081 },
  { id: "gurugram", name: "Gurugram", region: "Haryana", country: "India", latitude: 28.4595, longitude: 77.0266 },
  { id: "noida", name: "Noida", region: "Uttar Pradesh", country: "India", latitude: 28.5355, longitude: 77.391 },
  { id: "chandigarh", name: "Chandigarh", country: "India", latitude: 30.7333, longitude: 76.7794 },
  { id: "amritsar", name: "Amritsar", region: "Punjab", country: "India", latitude: 31.634, longitude: 74.8723 },
  { id: "meerut", name: "Meerut", region: "Uttar Pradesh", country: "India", latitude: 28.9845, longitude: 77.7064 },
  { id: "visakhapatnam", name: "Visakhapatnam", region: "Andhra Pradesh", country: "India", latitude: 17.6868, longitude: 83.2185 },
  { id: "coimbatore", name: "Coimbatore", region: "Tamil Nadu", country: "India", latitude: 11.0168, longitude: 76.9558 },
  { id: "kochi", name: "Kochi", region: "Kerala", country: "India", latitude: 9.9312, longitude: 76.2673 },
  { id: "ludhiana", name: "Ludhiana", region: "Punjab", country: "India", latitude: 30.901, longitude: 75.8573 },
  { id: "guwahati", name: "Guwahati", region: "Assam", country: "India", latitude: 26.1445, longitude: 91.7362 },
  { id: "thiruvananthapuram", name: "Thiruvananthapuram", region: "Kerala", country: "India", latitude: 8.5241, longitude: 76.9366 },
  { id: "dehradun", name: "Dehradun", region: "Uttarakhand", country: "India", latitude: 30.3165, longitude: 78.0322 },
  { id: "vijayawada", name: "Vijayawada", region: "Andhra Pradesh", country: "India", latitude: 16.5062, longitude: 80.648 },
];

export const DEFAULT_CITY = CITIES[0];

export const DEFAULT_PROFILE: Profile = {
  displayName: "Your household",
  city: DEFAULT_CITY,
  household: {
    adults: 2,
    children: 1,
    elders: 1,
    respiratory: true,
    pregnant: false,
    pets: false,
  },
  home: {
    type: "apartment",
    floor: "low",
    cookingFuel: "lpg",
    ventilation: "cross",
    purifier: "none",
    indoorSmoke: "incense",
  },
  mobility: {
    primary: "two-wheeler",
    commuteMinutes: 35,
    schoolRun: true,
    workFromHomeDays: 1,
  },
  budget: "balanced",
  priorities: ["health", "planet"],
};

export function findCity(id: string): City | undefined {
  return CITIES.find((city) => city.id === id);
}

export function cityLabel(city: City): string {
  return city.region ? `${city.name}, ${city.region}` : city.name;
}

export function buildCityQuery(city: City): string {
  const params = new URLSearchParams({
    id: city.id,
    name: city.name,
    country: city.country,
    lat: String(city.latitude),
    lon: String(city.longitude),
  });
  if (city.region) params.set("region", city.region);
  return params.toString();
}
