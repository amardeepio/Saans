import type { OutdoorWindow, Profile, Swap } from "../types";
import { commuteFootprint, commuteKm } from "./context";

export function pickSwaps(profile: Profile, best: OutdoorWindow): Swap[] {
  const swaps: Swap[] = [];
  const commute = commuteFootprint(profile);
  const usesMotorVehicle =
    profile.mobility.primary === "car" || profile.mobility.primary === "two-wheeler";
  const km = commuteKm(profile);

  if (usesMotorVehicle) {
    const monthly = Math.round((commute / 5) * 10) / 10;
    const money = Math.round(
      km * 2 * 4 * (profile.mobility.primary === "car" ? 7 : 2.2),
    );
    swaps.push({
      id: "one-transit-day",
      title: "One transit day a week",
      description:
        "Pick the commute day with the cleanest air forecast and take transit or carpool instead of driving alone.",
      impact: `≈${monthly} kg CO₂e avoided each month`,
      cost: `≈₹${money.toLocaleString("en-IN")} fuel saved / month`,
      co2eKgMonth: monthly,
      exposurePct: 5,
      fit: "best-fit",
    });
  }

  swaps.push({
    id: "pressure-cooker",
    title: "Lid on, flame low",
    description:
      "A pressure cooker or a well-fitted lid cuts cooking energy and keeps moisture and smoke out of the kitchen.",
    impact: "≈3 kg CO₂e avoided each month",
    cost: "≈₹120 saved / month",
    co2eKgMonth: 3,
    exposurePct: 3,
    fit: profile.priorities.includes("cost") ? "best-fit" : "good-fit",
  });

  if (profile.home.indoorSmoke !== "none") {
    swaps.push({
      id: "no-burn-week",
      title: "A no-burn week",
      description:
        "Replace incense, candles and mosquito coils with a fan, a net or a closed bin. Indoor smoke can rival a busy road.",
      impact: "One of the fastest indoor-PM wins",
      cost: "₹0 to start",
      co2eKgMonth: 0.3,
      exposurePct: 9,
      fit: "best-fit",
    });
  }

  if (profile.mobility.schoolRun) {
    swaps.push({
      id: "school-pool",
      title: "A three-family school pool",
      description:
        "One car, three households, a fixed weekly rota. Fewer idling cars at the gate and cleaner air for every child.",
      impact: "Cuts school-run vehicle trips by up to two-thirds",
      cost: "Shared fuel costs fall for everyone",
      co2eKgMonth: Math.max(2, Math.round(commute * 0.2 * 10) / 10),
      exposurePct: 4,
      fit: profile.household.children > 0 ? "best-fit" : "good-fit",
    });
  }

  if (profile.home.cookingFuel === "biomass") {
    swaps.push({
      id: "clean-cooking",
      title: "Move cooking off solid fuel",
      description:
        "A subsidized LPG connection, electric induction plate or a community clean-cooking programme removes the single largest indoor smoke source.",
      impact: "The biggest indoor-air upgrade available",
      cost: "Ask your municipal helpline about subsidies",
      co2eKgMonth: 6,
      exposurePct: 20,
      fit: "best-fit",
    });
  }

  if (best.verdict === "avoid") {
    swaps.push({
      id: "indoor-play",
      title: "Swap the outdoor drill for an indoor circuit",
      description:
        "Ten minutes of stair climbs, stretching and dancing gives children movement without a lungful of the day's worst air.",
      impact: "Protects the highest-exposure part of a child's day",
      cost: "Free",
      co2eKgMonth: 0,
      exposurePct: 7,
      fit: "good-fit",
    });
  }

  const priorityWeight = (swap: Swap) => {
    let score = swap.fit === "best-fit" ? 5 : 2;
    if (profile.priorities.includes("health")) score += swap.exposurePct * 0.4;
    if (profile.priorities.includes("planet")) score += swap.co2eKgMonth * 0.3;
    if (profile.priorities.includes("cost")) score += Math.max(0, swap.co2eKgMonth);
    return score;
  };

  return swaps.sort((a, b) => priorityWeight(b) - priorityWeight(a)).slice(0, 4);
}
