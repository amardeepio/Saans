import type { City, Profile } from "./types";

export const CITIES: City[] = [
  { id: "delhi", name: "Delhi", region: "NCT", country: "India", latitude: 28.6139, longitude: 77.209 },
  { id: "lahore", name: "Lahore", region: "Punjab", country: "Pakistan", latitude: 31.5204, longitude: 74.3587 },
  { id: "dhaka", name: "Dhaka", country: "Bangladesh", latitude: 23.8103, longitude: 90.4125 },
  { id: "mumbai", name: "Mumbai", region: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777 },
  { id: "kolkata", name: "Kolkata", region: "West Bengal", country: "India", latitude: 22.5726, longitude: 88.3639 },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", latitude: 27.7172, longitude: 85.324 },
  { id: "bengaluru", name: "Bengaluru", region: "Karnataka", country: "India", latitude: 12.9716, longitude: 77.5946 },
  { id: "karachi", name: "Karachi", region: "Sindh", country: "Pakistan", latitude: 24.8607, longitude: 67.0011 },
  { id: "islamabad", name: "Islamabad", country: "Pakistan", latitude: 33.6844, longitude: 73.0479 },
  { id: "patna", name: "Patna", region: "Bihar", country: "India", latitude: 25.5941, longitude: 85.1376 },
  { id: "lucknow", name: "Lucknow", region: "Uttar Pradesh", country: "India", latitude: 26.8467, longitude: 80.9462 },
  { id: "hyderabad", name: "Hyderabad", region: "Telangana", country: "India", latitude: 17.385, longitude: 78.4867 },
  { id: "chennai", name: "Chennai", region: "Tamil Nadu", country: "India", latitude: 13.0827, longitude: 80.2707 },
  { id: "ahmedabad", name: "Ahmedabad", region: "Gujarat", country: "India", latitude: 23.0225, longitude: 72.5714 },
  { id: "pune", name: "Pune", region: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567 },
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
