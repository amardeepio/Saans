import {
  aqiCategory,
  exposureWeight,
  maskGuidance,
  riskFor,
  riskSentence,
  RISK_LABELS,
  sensitiveGroups,
} from "./aqi";
import { hourLabelFromIso } from "./sample-air";
import type {
  ActionCategory,
  Advice,
  AirReading,
  Effort,
  OutdoorWindow,
  PlanAction,
  PriorityLevel,
  Profile,
  Swap,
  TimeSlot,
} from "./types";

const SLOT_ORDER: Record<TimeSlot, number> = {
  morning: 0,
  midday: 1,
  evening: 2,
  night: 3,
};

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  health: "Health shield",
  home: "Indoor air",
  mobility: "Getting around",
  sustainability: "Cleaner choice",
  community: "Community",
};

interface ActionInput {
  id: string;
  title: string;
  slot: TimeSlot;
  timeLabel: string;
  category: ActionCategory;
  priority: PriorityLevel;
  summary: string;
  steps: string[];
  why: string;
  effort: Effort;
  exposurePct: number;
  co2eKgMonth?: number;
  costInrMonth?: number;
  tags: string[];
  score?: number;
}

function makeAction(input: ActionInput): PlanAction {
  const exposurePct = Math.max(0, Math.min(25, Math.round(input.exposurePct)));
  const co2eKgMonth = Math.max(0, Math.round((input.co2eKgMonth ?? 0) * 10) / 10);
  const costInrMonth = Math.round(input.costInrMonth ?? 0);
  const healthScore = exposurePct * 2.3;
  const planetScore = co2eKgMonth * 0.8;
  const moneyScore = Math.max(-10, Math.min(25, costInrMonth / 45));
  const score = input.score ?? healthScore + planetScore + moneyScore;

  return {
    ...input,
    categoryLabel: CATEGORY_LABELS[input.category],
    impact: { exposurePct, co2eKgMonth, costInrMonth },
    score: Math.round(score * 10) / 10,
  };
}

function blockLabel(time: string, hoursAhead: number): string {
  const match = time.match(/T(\d{2})/);
  const startHour = match ? Number(match[1]) : new Date(time).getHours();
  const endHour = (startHour + hoursAhead) % 24;
  const format = (hour: number) => {
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
  };
  return `${format(startHour)}–${format(endHour)}`;
}

function windowVerdict(aqi: number): OutdoorWindow["verdict"] {
  if (aqi <= 75) return "good";
  if (aqi <= 120) return "short";
  return "avoid";
}

function verdictDetail(verdict: OutdoorWindow["verdict"], sensitive: boolean): string {
  if (verdict === "good") {
    return sensitive
      ? "A reasonable window for a short outing. Keep outdoor play gentle."
      : "The cleanest stretch in the next 24 hours. Good for errands or a walk.";
  }
  if (verdict === "short") {
    return sensitive
      ? "Still hazy. Keep any outdoor time brief and avoid hard exertion."
      : "The least-hazy two-hour stretch. Keep outdoor time moderate.";
  }
  return "No clean outdoor window today. Keep essential trips short and protected.";
}

function buildWindows(air: AirReading, sensitive: boolean): Advice["windows"] {
  const points = air.hourly.length >= 2 ? air.hourly : [{ ...air, time: air.observedAt }];
  let bestIndex = 0;
  let worstIndex = 0;
  let bestAverage = Number.POSITIVE_INFINITY;
  let worstAverage = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < Math.max(1, points.length - 1); index += 1) {
    const first = points[index];
    const second = points[index + 1] ?? points[index];
    const average = (first.aqi + second.aqi) / 2;
    if (average < bestAverage) {
      bestAverage = average;
      bestIndex = index;
    }
    if (average > worstAverage) {
      worstAverage = average;
      worstIndex = index;
    }
  }

  const bestStart = points[bestIndex];
  const worstStart = points[worstIndex];
  const bestAqi = Math.round(bestAverage);
  const worstAqi = Math.round(worstAverage);
  const bestVerdict = windowVerdict(bestAqi);

  return {
    best: {
      start: bestStart.time,
      end: points[bestIndex + 2]?.time ?? bestStart.time,
      label: blockLabel(bestStart.time, 2),
      aqi: bestAqi,
      verdict: bestVerdict,
      detail: verdictDetail(bestVerdict, sensitive),
    },
    worst: {
      start: worstStart.time,
      end: points[worstIndex + 2]?.time ?? worstStart.time,
      label: blockLabel(worstStart.time, 2),
      aqi: worstAqi,
      verdict: windowVerdict(worstAqi),
      detail:
        worstAqi <= 100
          ? "Air is relatively even today; traffic peaks still make this the busiest window."
          : "This is the dirtiest two-hour stretch. Move errands and exercise out of it.",
    },
  };
}

function commuteKm(profile: Profile): number {
  const speed = profile.mobility.primary === "car" ? 24 : 19;
  return Math.max(2, (profile.mobility.commuteMinutes / 60) * speed);
}

function commuteFootprint(profile: Profile): number {
  const km = commuteKm(profile);
  const factor = profile.mobility.primary === "car" ? 0.17 : 0.045;
  return km * factor * 2 * 20;
}

function combinedExposure(actions: PlanAction[]): number {
  const remaining = actions.reduce(
    (product, action) => product * (1 - action.impact.exposurePct / 100),
    1,
  );
  // Actions overlap and compliance is never perfect, so the household-level
  // estimate is deliberately capped below what the individual numbers imply.
  return Math.min(45, Math.round((1 - remaining) * 100));
}

function pickSwaps(profile: Profile, best: OutdoorWindow): Swap[] {
  const swaps: Swap[] = [];
  const commute = commuteFootprint(profile);
  const usesMotorVehicle = profile.mobility.primary === "car" || profile.mobility.primary === "two-wheeler";
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
        "A subsidised LPG connection, electric induction plate or a community clean-cooking programme removes the single largest indoor smoke source.",
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

export function buildAdvice(profile: Profile, air: AirReading): Advice {
  const risk = riskFor(air.aqi, profile.household);
  const sensitive = sensitiveGroups(profile.household);
  const hasSensitive = sensitive.length > 0;
  const windows = buildWindows(air, hasSensitive);
  const weight = exposureWeight(profile);
  const aqi = air.aqi;
  const high = aqi > 150;
  const severe = aqi > 200;
  const category = aqiCategory(aqi);
  const commute = commuteFootprint(profile);
  const actions: PlanAction[] = [];
  const mask = maskGuidance(aqi);
  const bestWindow = windows.best.label.toLowerCase();
  const schoolChild = profile.household.children > 0;
  const hasElder = profile.household.elders > 0;

  if (profile.mobility.schoolRun && schoolChild) {
    actions.push(
      makeAction({
        id: "school-shield",
        title: high ? "Shield the school run" : "Make the school run cleaner",
        slot: "morning",
        timeLabel: "Before the school bell",
        category: "health",
        priority: high ? "now" : "today",
        summary: high
          ? "Turn the trip into a short, protected exposure — not a lingering one."
          : "Small route and timing changes keep the school morning out of the dirtiest traffic.",
        steps: [
          high ? "Fit an N95/FFP2 on children over two; check the seal around the nose." : "A scarf is not a filter. Keep an N95 handy for hazy mornings.",
          "Use the quietest side street, even if it adds two minutes.",
          "Wait away from the school gate's idling line, never in it.",
          "Ask the school to move outdoor assembly indoors when AQI is above 150.",
        ],
        why: `Children breathe faster and take in more air per kilogram than adults. Their 15-minute trip can be a meaningful share of the day's PM2.5 dose. At AQI ${aqi}, ${mask.toLowerCase()}`,
        effort: "easy",
        exposurePct: high ? 10 : 6,
        costInrMonth: 0,
        tags: ["children", "commute", "N95"],
        score: high ? 54 : 38,
      }),
    );
  }

  if (hasElder || profile.household.respiratory) {
    actions.push(
      makeAction({
        id: "care-plan",
        title: "Keep the care plan within reach",
        slot: "morning",
        timeLabel: "Start of day",
        category: "health",
        priority: severe ? "now" : "today",
        summary:
          "Put the family's agreed medicines, inhaler and emergency contacts where everyone can find them.",
        steps: [
          "Check that prescribed relievers are not empty or expired.",
          "Agree who will check in on an older family member at lunchtime.",
          "If breathing becomes difficult, follow the care plan and seek medical help.",
        ],
        why:
          "Poor air can worsen existing heart and lung conditions. Preparation is not treatment — it simply removes friction when someone needs help quickly.",
        effort: "easy",
        exposurePct: 0,
        costInrMonth: 0,
        tags: ["older adults", "respiratory", "safety"],
        score: 44,
      }),
    );
  }

  if (profile.home.purifier === "none") {
    const budgetCost = profile.budget === "lean" ? -220 : profile.budget === "comfortable" ? -650 : -380;
    actions.push(
      makeAction({
        id: "clean-room",
        title: "Create one clean room",
        slot: "morning",
        timeLabel: "Set up once, use all day",
        category: "home",
        priority: high ? "now" : "today",
        summary:
          "Concentrate your effort in the room where the household sleeps or spends the most time.",
        steps: [
          "Choose the smallest room used most; close its door and windows.",
          "If buying a purifier, choose HEPA H13 and a CADR suited to the room. Skip ozone generators.",
          "On a lean budget, damp-wipe surfaces, wash curtains and keep the door closed. A fan-filter box is a last resort and needs careful electrical safety.",
          "Run it on high for 30 minutes before bedtime, then on a quiet low setting.",
        ],
        why: `Most people spend 80–90% of their time indoors, and outdoor PM2.5 follows you in. A single well-sized filtered room can sharply lower the air a child or older adult breathes overnight. ${profile.budget === "lean" ? "The first priority is dust control and a sealed room, not an expensive device." : "You do not need to filter the whole home to get a useful reduction."}`,
        effort: profile.budget === "lean" ? "easy" : "medium",
        exposurePct: high ? 18 : 11,
        co2eKgMonth: 8,
        costInrMonth: budgetCost,
        tags: ["purifier", "sleep", "indoor air"],
        score: high ? 62 : 43,
      }),
    );
  } else {
    actions.push(
      makeAction({
        id: "purifier-tune",
        title: "Tune the purifier to the day",
        slot: "morning",
        timeLabel: "Before the morning peak",
        category: "home",
        priority: "today",
        summary:
          "A purifier only helps when it is sized, placed and timed for the room it is in.",
        steps: [
          "Place it at least 30 cm from walls and furniture; do not hide it behind a curtain.",
          "Close the room's windows while it runs.",
          "Run high before occupancy, then low overnight.",
          "Replace the filter when the indicator says so, or every 6–12 months in heavy-use homes.",
        ],
        why:
          "A purifier working against an open window is mostly filtering the neighbourhood. Closing the room and matching the clean-air delivery rate to its size is what changes the air a person actually breathes.",
        effort: "easy",
        exposurePct: 9,
        co2eKgMonth: 7,
        costInrMonth: -90,
        tags: ["purifier", "filter", "indoor air"],
        score: 42,
      }),
    );
  }

  if (profile.home.ventilation === "sealed" && !severe) {
    actions.push(
      makeAction({
        id: "airing",
        title: "Use the cleanest hour to air the house",
        slot: "midday",
        timeLabel: bestWindow,
        category: "home",
        priority: "today",
        summary:
          "A short cross-breeze at the right time clears stale indoor air without inviting in the worst of the day.",
        steps: [
          `Open opposite windows for 10–15 minutes around ${bestWindow}.`,
          "Move the purifier to another room or switch it off while windows are open.",
          "Close up again before the evening traffic peak.",
        ],
        why:
          "Homes trap CO₂, cooking moisture and volatile chemicals as well as particles. Timed ventilation improves the things a filter cannot remove, without paying for it with a window full of traffic smoke.",
        effort: "easy",
        exposurePct: 4,
        co2eKgMonth: 0,
        costInrMonth: 0,
        tags: ["ventilation", "CO2", "timing"],
        score: 30,
      }),
    );
  } else if (high) {
    actions.push(
      makeAction({
        id: "close-up",
        title: "Close up before the peak",
        slot: "morning",
        timeLabel: "Before 7:30 AM",
        category: "home",
        priority: "now",
        summary:
          "Shut street-facing windows and doors before the morning traffic and inversion layer build.",
        steps: [
          "Close windows facing the road; use a damp towel at a visible draught if needed.",
          "Keep balcony doors closed until the AQI drops below 150.",
          "Do not burn incense, coils or candles to 'freshen' the room — that adds particles.",
          "Recheck the air at the cleaner window before opening up again.",
        ],
        why:
          "Outdoor PM2.5 is small enough to travel indoors and can accumulate when the air is still. Closing up during the morning peak reduces the particles your purifier or lungs have to handle.",
        effort: "easy",
        exposurePct: 8,
        co2eKgMonth: 0,
        costInrMonth: 0,
        tags: ["windows", "morning peak", "indoor air"],
        score: 48,
      }),
    );
  }

  if (profile.home.indoorSmoke !== "none") {
    actions.push(
      makeAction({
        id: "stop-indoor-burning",
        title:
          profile.home.indoorSmoke === "incense"
            ? "Skip the incense and coils today"
            : "Keep combustion out of the house",
        slot: "evening",
        timeLabel: "Dusk and bedtime",
        category: "home",
        priority: "today",
        summary:
          "The smoke you generate indoors can be as concentrated as the air outside.",
        steps: [
          profile.home.indoorSmoke === "incense"
            ? "Swap incense, dhoop and mosquito coils for a fan, a net or a closed bin."
            : "Move solid-fuel burning outdoors and away from windows — better still, stop it.",
          "Never use a generator or charcoal stove indoors.",
          "If someone has already burned something, ventilate only when outdoor AQI is lower than indoor smoke.",
        ],
        why:
          "Combustion particles are ultra-fine and land deep in the lungs. A stick of incense or a mosquito coil can push a small room's PM2.5 above the outdoor reading, undoing the day's protection in minutes.",
        effort: "easy",
        exposurePct: 10,
        co2eKgMonth: 0.6,
        costInrMonth: 0,
        tags: ["smoke-free", "incense", "coils"],
        score: 51,
      }),
    );
  }

  if (profile.home.cookingFuel === "biomass") {
    actions.push(
      makeAction({
        id: "clean-cooking",
        title: "Move cooking off solid fuel",
        slot: "midday",
        timeLabel: "Before the next meal",
        category: "home",
        priority: "now",
        summary:
          "This is the highest-impact indoor-air action available to your household.",
        steps: [
          "Cook on LPG or induction where available; keep the kitchen door closed.",
          "If solid fuel is unavoidable today, cook with the exhaust on and windows open away from bedrooms.",
          "Ask your municipal helpline or local health worker about clean-cooking subsidies and LPG connections.",
          "Never cook on coal indoors while anyone sleeps in the same room.",
        ],
        why:
          "Solid-fuel smoke is a major source of household PM2.5 and carbon monoxide. Replacing it reduces exposure every day, not just on smoggy ones — and it is often the biggest single health gain in the home.",
        effort: "commitment",
        exposurePct: 20,
        co2eKgMonth: 6,
        costInrMonth: -400,
        tags: ["cooking", "biomass", "clean fuel"],
        score: 69,
      }),
    );
  } else if (profile.home.cookingFuel === "lpg" || profile.home.cookingFuel === "piped-gas") {
    actions.push(
      makeAction({
        id: "kitchen-exhaust",
        title: "Run the kitchen exhaust to the end",
        slot: "midday",
        timeLabel: "At every meal",
        category: "home",
        priority: "today",
        summary:
          "Cooking produces fine particles even on gas. Give the exhaust ten extra minutes.",
        steps: [
          "Switch the exhaust on before the pan heats and off 10 minutes after cooking.",
          "Use the back burner, and keep a lid on when you can.",
          "Open the kitchen window a crack only if outdoor AQI is below the indoor reading.",
        ],
        why:
          "Gas cooking releases NO₂ and fine particles, and frying adds more. The exhaust is cheap to run and removes the plume before it spreads into bedrooms. A lid also cuts both energy use and splatter.",
        effort: "easy",
        exposurePct: 6,
        co2eKgMonth: 2.4,
        costInrMonth: 90,
        tags: ["cooking", "exhaust", "NO2"],
        score: 37,
      }),
    );
  }

  if (profile.mobility.primary === "car") {
    const transitSaved = Math.round((commute / 5) * 10) / 10;
    const fuelSaved = Math.round(commuteKm(profile) * 2 * 4 * 7);
    actions.push(
      makeAction({
        id: "commute-swap",
        title: "Take one cleaner commute",
        slot: "midday",
        timeLabel: "Plan for tomorrow",
        category: "sustainability",
        priority: "this-week",
        summary: `One transit or carpool day a week avoids about ${transitSaved} kg CO₂e a month.`,
        steps: [
          `Check the ${bestWindow} forecast before choosing your transit day.`,
          "Combine the school run with a neighbour's trip if schedules allow.",
          "If you must drive, switch the air to recirculate in traffic and never idle at the gate.",
        ],
        why:
          "A single car commute can emit more CO₂e than a week of careful home electricity use. One changed day a week is a realistic start, and it also cuts the traffic pollution everyone else breathes.",
        effort: "medium",
        exposurePct: 5,
        co2eKgMonth: transitSaved,
        costInrMonth: fuelSaved,
        tags: ["car", "transit", "CO2"],
        score: 41,
      }),
    );
  } else if (profile.mobility.primary === "two-wheeler") {
    const transitSaved = Math.round((commute / 5) * 10) / 10;
    const fuelSaved = Math.round(commuteKm(profile) * 2 * 4 * 2.2);
    actions.push(
      makeAction({
        id: "scooter-shield",
        title: "Ride behind the traffic, not in its plume",
        slot: "midday",
        timeLabel: "Commute home",
        category: "mobility",
        priority: "today",
        summary:
          "Two-wheeler riders sit at exhaust height. Route, speed and a fitted mask matter.",
        steps: [
          "Take a parallel lane or side street instead of the main corridor at peak hour.",
          "Wear a well-fitted N95/FFP2; a cloth scarf will not seal.",
          "Keep distance from buses and trucks — their exhaust plume is strongest directly behind.",
          "Try one transit day this week; it avoids about " + transitSaved + " kg CO₂e a month.",
        ],
        why: `At AQI ${aqi}, a rider's exposure can be several times a walker's on the same road because of position in traffic. A well-fitted mask and a lower-traffic route are the two changes that matter most.`,
        effort: "easy",
        exposurePct: 8,
        co2eKgMonth: 1.5,
        costInrMonth: 0,
        tags: ["two-wheeler", "N95", "route"],
        score: 42,
      }),
    );
  } else if (profile.mobility.primary === "walk" || profile.mobility.primary === "cycle") {
    actions.push(
      makeAction({
        id: "quiet-route",
        title: "Take the quiet-street route",
        slot: "midday",
        timeLabel: "Walk or ride",
        category: "mobility",
        priority: "today",
        summary:
          "On foot or cycle, the route matters more than the destination. Move one street away from traffic.",
        steps: [
          "Choose the side with trees and buildings set back from the road.",
          "Shift a hard ride or long walk to the cleaner window if one exists.",
          "For cycling in heavy smog, use a fitted N95 and keep the effort moderate.",
        ],
        why:
          "Traffic-related pollution falls sharply within a few metres of the kerb. A quieter parallel street often has lower PM2.5, and it is a calmer, safer place to walk or ride.",
        effort: "easy",
        exposurePct: 6,
        co2eKgMonth: 0,
        costInrMonth: 0,
        tags: ["walking", "cycling", "route"],
        score: 33,
      }),
    );
  } else {
    actions.push(
      makeAction({
        id: "transit-stop",
        title: "Wait away from the kerb",
        slot: "midday",
        timeLabel: "At the stop",
        category: "mobility",
        priority: "today",
        summary:
          "Bus stops beside idling traffic can be a hotspot. Put a few metres between you and the queue.",
        steps: [
          "Wait upwind and back from the road edge, not beside the bus exhaust.",
          "Keep a fitted N95 for high-AQI days.",
          "Offer the cleaner seat to an older passenger or someone who is pregnant.",
        ],
        why:
          "Exposure is concentrated in the minutes beside idling vehicles. Standing back and upwind is free, immediate protection while you use public transport.",
        effort: "easy",
        exposurePct: 5,
        co2eKgMonth: 0,
        costInrMonth: 0,
        tags: ["bus", "transit", "exposure"],
        score: 28,
      }),
    );
  }

  const movementAction = bestWindow;
  actions.push(
    makeAction({
      id: "move-outdoors",
      title: windows.best.verdict === "avoid" ? "Move play indoors" : "Use the cleaner window",
      slot: "evening",
      timeLabel: movementAction,
      category: "health",
      priority: "today",
      summary:
        windows.best.verdict === "avoid"
          ? "Today has no clean outdoor window. Give children movement without the exposure."
          : `The cleanest stretch is ${movementAction} at about AQI ${windows.best.aqi}.`,
      steps:
        windows.best.verdict === "avoid"
          ? [
              "Try 10 minutes of indoor dancing, stair climbs or stretching.",
              "Keep the purifier in the room where children are active.",
              "Do not send children outdoors for sports or long play.",
            ]
          : [
              `Plan the walk, errand or play session for ${movementAction}.`,
              "Keep hard exercise shorter than usual; breathing rate multiplies the dose.",
              "Avoid the roadside; use a park or quieter street.",
            ],
      why:
        "The same activity can mean a very different dose depending on when and where it happens. Shifting outdoor time to the least-polluted two-hour window is one of the cheapest ways to reduce exposure.",
      effort: "easy",
      exposurePct: windows.best.verdict === "avoid" ? 9 : 6,
      co2eKgMonth: 0,
      costInrMonth: 0,
      tags: ["exercise", "timing", "children"],
      score: 39,
    }),
  );

  actions.push(
    makeAction({
      id: "damp-clean",
      title: "Damp-clean, don't stir the dust",
      slot: "midday",
      timeLabel: "Afternoon reset",
      category: "home",
      priority: "today",
      summary:
        "A five-minute wipe removes the dust that settles on surfaces — without launching it back into the air.",
      steps: [
        "Use a damp cloth or mop rather than a dry broom or feather duster.",
        "Prioritise window sills, bedside tables and the floor where a child plays.",
        "Put mats at doors and take shoes off inside.",
      ],
      why:
        "Settled dust is a reservoir of particles and allergens. Wet cleaning removes it instead of resuspending it, and it is free. Skip air fresheners — they add VOCs rather than removing anything.",
      effort: "easy",
      exposurePct: 5,
      co2eKgMonth: 0,
      costInrMonth: 0,
      tags: ["dust", "cleaning", "allergens"],
      score: 29,
    }),
  );

  actions.push(
    makeAction({
      id: "bedroom-ready",
      title: "Prep the bedroom for the night",
      slot: "night",
      timeLabel: "30 minutes before bed",
      category: "home",
      priority: "today",
      summary:
        "Make the room where the household sleeps the cleanest room in the house.",
      steps: [
        "Close the bedroom windows and door; keep the corridor door shut too.",
        "Run the purifier on high for 30 minutes, then low overnight.",
        "Keep the bed away from the window and wipe the sill before bed.",
        "Shower or change out of outdoor clothes before getting into bed.",
      ],
      why:
        "People spend roughly a third of their lives in the bedroom. Reducing overnight PM2.5 while the body rests is a high-value, low-effort part of a smog-day routine, especially for a child or older adult.",
      effort: "easy",
      exposurePct: 8,
      co2eKgMonth: 2,
      costInrMonth: -60,
      tags: ["sleep", "bedroom", "purifier"],
      score: 45,
    }),
  );

  if (severe || profile.priorities.includes("planet") || profile.priorities.includes("comfort")) {
    actions.push(
      makeAction({
        id: "community-pulse",
        title: "Put one clean-air action on the building group",
        slot: "evening",
        timeLabel: "After dinner",
        category: "community",
        priority: "this-week",
        summary:
          "Individual choices help. Shared rules — no burning, no idling, a clean common room — help everyone.",
        steps: [
          "Share the best outdoor window from this plan with neighbours.",
          "Ask the building to stop leaf and waste burning, and report a roadside fire on your municipal channel.",
          "Propose one filtered corner in a community room for children and older residents.",
        ],
        why:
          "A neighbourhood's air is shared. Waste burning, generator exhaust and idling at the gate add up street by street. Coordinating one rule or one clean room multiplies the benefit of household effort.",
        effort: "commitment",
        exposurePct: 3,
        co2eKgMonth: 1,
        costInrMonth: 0,
        tags: ["community", "waste burning", "collective"],
        score: 34,
      }),
    );
  }

  const deduped = Array.from(new Map(actions.map((action) => [action.id, action])).values());
  const ranked = [...deduped].sort((a, b) => b.score - a.score);
  const topAction = ranked[0];
  const selected = ranked.slice(0, 9);
  selected.sort((a, b) => {
    if (SLOT_ORDER[a.slot] !== SLOT_ORDER[b.slot]) {
      return SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot];
    }
    return b.score - a.score;
  });

  const riskLabel = RISK_LABELS[risk];
  const exposure = combinedExposure(selected);
  const co2e = Math.round(selected.reduce((sum, action) => sum + action.impact.co2eKgMonth, 0) * 10) / 10;
  const cost = selected.reduce((sum, action) => sum + action.impact.costInrMonth, 0);
  const sensitiveText =
    sensitive.length > 0
      ? ` Your plan gives extra weight to ${sensitive.join(", ")}.`
      : " Your plan prioritises low-effort changes that most households can keep.";

  const headline =
    risk === "critical"
      ? "Make one room the safe harbour"
      : risk === "severe"
        ? "Keep the day close to home"
        : risk === "high"
          ? "Protect the morning, clean the indoors"
          : risk === "elevated"
            ? "A watchful, well-ventilated day"
            : "A good day to bank cleaner habits";

  const alert =
    aqi > 300
      ? "Hazardous air: avoid outdoor exercise, burning anything indoors and unnecessary trips. Keep medicines and a charged phone nearby."
      : aqi > 200
        ? "Very poor air: children, older adults and anyone with a heart or lung condition should stay indoors where possible."
        : aqi > 150
          ? "Unhealthy air: cut prolonged outdoor exertion and keep windows facing the road closed during peaks."
          : null;

  return {
    risk,
    riskLabel,
    headline,
    summary: `${profile.city.name} is ${category.label.toLowerCase()} at AQI ${aqi}. ${riskSentence(risk, hasSensitive)}${sensitiveText} The plan below is weighted for ${profile.mobility.primary === "car" ? "a car commute" : `a ${profile.mobility.primary.replace("-", " ")} commute`} and a ${profile.budget} budget.`,
    alert,
    actions: selected,
    topAction,
    windows,
    ledger: {
      exposurePct: exposure,
      co2eKgMonth: co2e,
      costInrMonth: cost,
      actionsCount: selected.length,
    },
    swaps: pickSwaps(profile, windows.best),
    contextNotes: [
      `Air quality: ${air.source === "open-meteo" ? "live Open-Meteo reading" : "sample winter pattern — live data was unavailable"}.`,
      "Exposure figures are modelled estimates for comparing actions, not medical measurements.",
      `Mask guidance at AQI ${aqi}: ${mask}`,
      `Vulnerability weighting: ${weight.toFixed(1)}× based on household composition.`,
    ],
  };
}

export function formatImpact(value: number, unit: string): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)} ${unit}`;
}

export function actionImpactLine(action: PlanAction): string[] {
  const lines: string[] = [];
  if (action.impact.exposurePct > 0) {
    lines.push(`≈${action.impact.exposurePct}% less daily PM2.5 exposure`);
  }
  if (action.impact.co2eKgMonth > 0) {
    lines.push(`${action.impact.co2eKgMonth} kg CO₂e avoided / month`);
  }
  if (action.impact.costInrMonth > 0) {
    lines.push(`₹${action.impact.costInrMonth} saved / month`);
  } else if (action.impact.costInrMonth < 0) {
    lines.push(`≈₹${Math.abs(action.impact.costInrMonth)} cost / month`);
  }
  return lines;
}
