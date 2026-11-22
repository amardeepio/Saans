import type { Profile } from "./types";

export function localSuggestions(profile: Profile): string[] {
  const suggestions = [
    "Is the school run safe today?",
    "How do I set up one clean room?",
    "What is the cheapest change that helps most?",
  ];
  if (profile.mobility.primary === "car" || profile.mobility.primary === "two-wheeler") {
    suggestions.unshift("Should I take transit or my vehicle today?");
  }
  if (profile.home.cookingFuel === "biomass" || profile.home.indoorSmoke !== "none") {
    suggestions.push("How do I reduce smoke inside the kitchen?");
  }
  return suggestions.slice(0, 3);
}
