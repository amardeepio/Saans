import type { PlanAction } from "../types";
import { commuteKm, makeAction, type AdviceContext } from "./context";

function buildMobilityAction(ctx: AdviceContext): PlanAction {
  const { profile, measurement, displayAqi, commute, bestWindow } = ctx;
  const mode = profile.mobility.primary;

  if (mode === "car") {
    const transitSaved = Math.round((commute / 5) * 10) / 10;
    const fuelSaved = Math.round(commuteKm(profile) * 2 * 4 * 7);
    return makeAction({
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
      why: "A single car commute can emit more CO₂e than a week of careful home electricity use. One changed day a week is a realistic start, and it also cuts the traffic pollution everyone else breathes.",
      effort: "medium",
      exposurePct: 5,
      co2eKgMonth: transitSaved,
      costInrMonth: fuelSaved,
      tags: ["car", "transit", "CO2"],
      score: 41,
    });
  }

  if (mode === "two-wheeler") {
    const transitSaved = Math.round((commute / 5) * 10) / 10;
    return makeAction({
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
      why: `At ${measurement.scaleLabel} ${displayAqi}, a rider's exposure can be several times a walker's on the same road because of position in traffic. A well-fitted mask and a lower-traffic route are the two changes that matter most.`,
      effort: "easy",
      exposurePct: 8,
      co2eKgMonth: 1.5,
      costInrMonth: 0,
      tags: ["two-wheeler", "N95", "route"],
      score: 42,
    });
  }

  if (mode === "walk" || mode === "cycle") {
    return makeAction({
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
      why: "Traffic-related pollution falls sharply within a few metres of the kerb. A quieter parallel street often has lower PM2.5, and it is a calmer, safer place to walk or ride.",
      effort: "easy",
      exposurePct: 6,
      co2eKgMonth: 0,
      costInrMonth: 0,
      tags: ["walking", "cycling", "route"],
      score: 33,
    });
  }

  return makeAction({
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
    why: "Exposure is concentrated in the minutes beside idling vehicles. Standing back and upwind is free, immediate protection while you use public transport.",
    effort: "easy",
    exposurePct: 5,
    co2eKgMonth: 0,
    costInrMonth: 0,
    tags: ["bus", "transit", "exposure"],
    score: 28,
  });
}

export function buildRoutineActions(ctx: AdviceContext): PlanAction[] {
  const { profile, measurement, windows, displayAqi, high, severe, mask, bestWindow } = ctx;
  const actions: PlanAction[] = [];

  if (profile.mobility.schoolRun && profile.household.children > 0) {
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
          high
            ? "Fit an N95/FFP2 on children over two; check the seal around the nose."
            : "A scarf is not a filter. Keep an N95 handy for hazy mornings.",
          "Use the quietest side street, even if it adds two minutes.",
          "Wait away from the school gate's idling line, never in it.",
          "Ask the school to move outdoor assembly indoors when AQI is above 150.",
        ],
        why: `Children breathe faster and take in more air per kilogram than adults. Their 15-minute trip can be a meaningful share of the day's PM2.5 dose. At ${measurement.scaleLabel} ${displayAqi}, ${mask.toLowerCase()}`,
        effort: "easy",
        exposurePct: high ? 10 : 6,
        costInrMonth: 0,
        tags: ["children", "commute", "N95"],
        score: high ? 54 : 38,
      }),
    );
  }

  if (profile.household.elders > 0 || profile.household.respiratory) {
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
        why: "Poor air can worsen existing heart and lung conditions. Preparation is not treatment — it simply removes friction when someone needs help quickly.",
        effort: "easy",
        exposurePct: 0,
        costInrMonth: 0,
        tags: ["older adults", "respiratory", "safety"],
        score: 44,
      }),
    );
  }

  actions.push(
    buildMobilityAction(ctx),
    makeAction({
      id: "move-outdoors",
      title: windows.best.verdict === "avoid" ? "Move play indoors" : "Use the cleaner window",
      slot: "evening",
      timeLabel: bestWindow,
      category: "health",
      priority: "today",
      summary:
        windows.best.verdict === "avoid"
          ? "Today has no clean outdoor window. Give children movement without the exposure."
          : `The cleanest stretch is ${bestWindow} at about ${measurement.scaleLabel} ${windows.best.displayAqi}.`,
      steps:
        windows.best.verdict === "avoid"
          ? [
              "Try 10 minutes of indoor dancing, stair climbs or stretching.",
              "Keep the purifier in the room where children are active.",
              "Do not send children outdoors for sports or long play.",
            ]
          : [
              `Plan the walk, errand or play session for ${bestWindow}.`,
              "Keep hard exercise shorter than usual; breathing rate multiplies the dose.",
              "Avoid the roadside; use a park or quieter street.",
            ],
      why: "The same activity can mean a very different dose depending on when and where it happens. Shifting outdoor time to the least-polluted two-hour window is one of the cheapest ways to reduce exposure.",
      effort: "easy",
      exposurePct: windows.best.verdict === "avoid" ? 9 : 6,
      co2eKgMonth: 0,
      costInrMonth: 0,
      tags: ["exercise", "timing", "children"],
      score: 39,
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
        why: "A neighbourhood's air is shared. Waste burning, generator exhaust and idling at the gate add up street by street. Coordinating one rule or one clean room multiplies the benefit of household effort.",
        effort: "commitment",
        exposurePct: 3,
        co2eKgMonth: 1,
        costInrMonth: 0,
        tags: ["community", "waste burning", "collective"],
        score: 34,
      }),
    );
  }

  return actions;
}
