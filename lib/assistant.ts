import { maskGuidance, sensitiveGroups } from "./aqi";
import type { Advice, AirReading, ChatResponse, Profile } from "./types";

type Topic =
  | "school"
  | "purifier"
  | "commute"
  | "outdoors"
  | "cooking"
  | "health"
  | "cost"
  | "community"
  | "plants"
  | "sleep"
  | "general";

const TOPIC_WORDS: Record<Exclude<Topic, "general">, string[]> = {
  school: ["school", "child", "children", "kid", "kids", "daughter", "son", "class", "tuition"],
  purifier: ["purifier", "filter", "hepa", "air purifier", "cadr", "clean room", "machine"],
  commute: ["commute", "metro", "bus", "car", "scooter", "bike", "cycle", "walk", "traffic", "office", "travel", "school run"],
  outdoors: ["outside", "outdoor", "run", "jog", "exercise", "play", "walk", "window", "timing", "best time", "safe"],
  cooking: ["cook", "cooking", "kitchen", "chulha", "biomass", "lpg", "gas", "smoke", "incense", "coil", "candle", "dhoop", "fire"],
  health: ["asthma", "breath", "cough", "wheeze", "chest", "symptom", "sick", "heart", "pregnan", "elder", "baby", "medical"],
  cost: ["cost", "cheap", "budget", "money", "afford", "price", "save", "expensive"],
  community: ["community", "neighbour", "neighbor", "building", "society", "school", "village", "together", "group", "municipal"],
  plants: ["plant", "money plant", "snake plant", "indoor plant", "greenery"],
  sleep: ["sleep", "bedroom", "night", "bed", "mattress"],
};

function detectTopic(message: string): Topic {
  const normalised = message.toLowerCase();
  let best: Topic = "general";
  let bestScore = 0;
  for (const [topic, words] of Object.entries(TOPIC_WORDS)) {
    let score = 0;
    for (const word of words) {
      if (normalised.includes(word)) score += word.length > 4 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic as Topic;
    }
  }
  return best;
}

function joinLines(lines: string[]): string {
  return lines.filter(Boolean).join("\n\n");
}

function childOrFamily(profile: Profile): string {
  if (profile.household.children > 0) return "your child";
  if (profile.household.elders > 0) return "your older family member";
  if (profile.household.respiratory) return "the family member with a respiratory condition";
  return "your household";
}

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

export function buildLocalAnswer(
  message: string,
  profile: Profile,
  air: AirReading,
  advice: Advice,
): ChatResponse {
  const topic = detectTopic(message);
  const city = profile.city.name;
  const aqi = air.aqi;
  const displayLabel = advice.measurement.scaleLabel;
  const displayAqi = advice.measurement.value;
  const best = advice.windows.best;
  const top = advice.topAction;
  const sensitive = sensitiveGroups(profile.household);
  const mask = maskGuidance(aqi);
  const isSensitive = sensitive.length > 0;

  switch (topic) {
    case "school": {
      const verdict =
        aqi > 200
          ? "Keep the school run as short and protected as possible. If the school allows it, ask for indoor drop-off and indoor play today."
          : aqi > 150
            ? "The school run is possible, but treat it as a protected exposure rather than a social stroll."
            : aqi > 100
              ? "A short, well-routed school run is reasonable, especially in the cleaner window."
              : "The school run looks reasonable today by air-quality standards.";
      return {
        mode: "local",
        answer: joinLines([
          `${city} is at ${displayLabel} ${displayAqi} right now. ${verdict}`,
          `Do this:\n• ${mask}\n• Take a side street and wait away from the idling gate line.\n• If you drive, recirculate the cabin air and switch off the engine while waiting.`,
          `Your cleanest two-hour window is ${best.label} at about ${displayLabel} ${best.displayAqi}. ${best.detail}`,
          isSensitive
            ? `Because ${sensitive.join(", ")} ${sensitive.length === 1 ? "is" : "are"} in the household, lean toward the lower-exposure option, not the most convenient one.`
            : "Keep the trip routine: short, calm and away from the busiest kerb.",
        ]),
        suggestions: [
          "What should my child wear outside?",
          "How do I make the bedroom cleaner?",
          "Should we cancel outdoor play?",
        ],
      };
    }
    case "purifier": {
      const hasPurifier = profile.home.purifier !== "none";
      return {
        mode: "local",
        answer: joinLines([
          hasPurifier
            ? "Start with placement: a purifier fighting an open window is mostly cleaning the neighbourhood."
            : "You do not need to filter the whole house. One well-sized, well-placed HEPA purifier in the room where you sleep or spend the most time is the practical first step.",
          "What matters:\n• HEPA H13 (or true HEPA), not an ozone generator or 'ioniser'.\n• CADR roughly matched to the room size; bigger is fine if noise and cost allow.\n• Close the room's windows while it runs.\n• Run high for 30 minutes before use, then low overnight.\n• Replace the filter every 6–12 months in heavy-smog use.",
          profile.budget === "lean"
            ? `On a lean budget, damp-dust, wash curtains and keep one room sealed first. A ${profile.home.purifier === "none" ? "cheap fan-filter box can help but has electrical and fit risks; a certified HEPA unit is safer" : "spare filter is a better spend than a second device"}.`
            : "Do not judge it by smell. A purifier removes particles you cannot smell; check the filter indicator and the room's closed-door routine instead.",
        ]),
        suggestions: [
          "Where should I place the purifier?",
          "How long should I run it?",
          "Do indoor plants clean the air?",
        ],
      };
    }
    case "commute": {
      const mode = profile.mobility.primary;
      const modeLine =
        mode === "car"
          ? "A car cabin with windows closed and air on recirculate is usually lower-exposure than a two-wheeler on the same road — but it still produces the traffic pollution everyone else breathes."
          : mode === "two-wheeler"
            ? "A two-wheeler puts you at exhaust height. A fitted N95, a parallel side street and distance from buses matter more than speed today."
            : "On foot or cycle, route matters: one street back from traffic can be meaningfully cleaner.";
      return {
        mode: "local",
        answer: joinLines([
          `At ${displayLabel} ${displayAqi}, ${modeLine}`,
          `For today:\n• ${mask}\n• Shift the trip toward ${best.label} if it is flexible.\n• If you are choosing between transit and a private vehicle, transit is the lower-carbon choice; add a fitted mask at crowded stops.`,
          `One weekly transit day would avoid roughly ${advice.swaps.find((swap) => swap.id === "one-transit-day")?.co2eKgMonth ?? 4} kg CO₂e a month for a commute like yours. That is a real, measurable change — not a token one.`,
          `Your first action today is still “${top.title}”. ${top.summary}`,
        ]),
        suggestions: [
          "What is the cleanest time to travel?",
          "Is a cloth mask enough?",
          "How can our building cut idling?",
        ],
      };
    }
    case "outdoors": {
      const outdoorLine =
        best.verdict === "avoid"
          ? "There is no genuinely clean outdoor window in the next 24 hours. Keep essential trips short, and move exercise or play indoors."
          : `The cleanest stretch is ${best.label} at about ${displayLabel} ${best.displayAqi}. ${best.detail}`;
      return {
        mode: "local",
        answer: joinLines([
          outdoorLine,
          `For ${childOrFamily(profile)}:\n• ${best.verdict === "avoid" ? "Choose 10 minutes of indoor movement instead of outdoor play." : "Keep hard exercise shorter than usual; breathing rate multiplies the dose."}\n• Avoid the roadside and busy junctions.\n• ${mask}`,
          `The dirtiest stretch is ${advice.windows.worst.label} at about ${displayLabel} ${advice.windows.worst.displayAqi}. Move errands and school pickup out of it where you can.`,
          "This is about reducing exposure, not eliminating it. A short, protected trip is often better than cancelling everything.",
        ]),
        suggestions: [
          "What indoor exercise works on bad days?",
          "Is it safe to open windows?",
          "How do I check the next 24 hours?",
        ],
      };
    }
    case "cooking": {
      const solidFuel = profile.home.cookingFuel === "biomass";
      return {
        mode: "local",
        answer: joinLines([
          solidFuel
            ? "Solid-fuel cooking is likely the largest controllable source of indoor smoke in your home. Moving to LPG, induction or a community clean-cooking option is the highest-impact change — more important than any single smog-day hack."
            : "Even a gas flame produces fine particles and NO₂. The exhaust fan is the cheapest tool you own; run it before the pan heats and for 10 minutes after you finish.",
          `Kitchen routine:\n• Keep the exhaust on through cooking.\n• Use a lid and the back burner.\n• ${profile.home.indoorSmoke === "incense" ? "Skip incense, dhoop and mosquito coils; they can push a small room's PM2.5 above the outdoor reading." : "Never burn charcoal or run a generator indoors."}\n• Keep the kitchen door closed so the plume does not travel to bedrooms.`,
          solidFuel
            ? "Ask your municipal helpline or a local health worker about LPG subsidies and clean-cooking programmes. This is a structural change, not a willpower problem."
            : "If outdoor air is cleaner than the kitchen, a short window crack while the exhaust runs helps. If not, keep it closed and rely on the exhaust.",
        ]),
        suggestions: [
          "How can I reduce cooking smoke cheaply?",
          "Are mosquito coils safe indoors?",
          "What clean-cooking support exists?",
        ],
      };
    }
    case "health": {
      return {
        mode: "local",
        answer: joinLines([
          "I can help with exposure and daily routines, not diagnosis or treatment. If someone has severe breathlessness, chest pain, confusion or blue lips, seek emergency medical help now.",
          `At ${displayLabel} ${displayAqi}, the practical focus for ${childOrFamily(profile)} is:\n• Keep prescribed relievers and the family care plan within reach.\n• Make the bedroom the cleanest room overnight.\n• ${mask}\n• Reduce outdoor exertion and avoid indoor smoke.`,
          advice.alert ??
            "Call your clinician if symptoms are worsening or a reliever is being needed more often than usual.",
          "Air pollution is a trigger, not the whole story. Keep following the treatment plan from your clinician.",
        ]),
        suggestions: [
          "How do I make a clean room?",
          "What should I do on a hazardous day?",
          "How can I protect an older parent?",
        ],
      };
    }
    case "cost": {
      const freeActions = advice.actions
        .filter((action) => action.impact.costInrMonth <= 0)
        .slice(0, 3);
      return {
        mode: "local",
        answer: joinLines([
          "You can get a meaningful reduction without buying a device. The cheapest wins are usually stopping indoor burning, closing the right windows at the right time, damp-dusting and shifting outdoor time.",
          `Your no-cost starting points:\n${freeActions.map((action) => `• ${action.title} — ${action.summary}`).join("\n")}`,
          profile.home.purifier === "none"
            ? `If you do buy one thing, a certified HEPA purifier for one bedroom is usually a better spend than several small units or an ozone generator. Expect roughly ₹${profile.budget === "lean" ? "200–400" : "300–600"} a month in filter and electricity costs.`
            : "Keep the filter clean and the room closed — that is free performance you may already be losing.",
          `Your plan's modelled net monthly cost is ${advice.ledger.costInrMonth >= 0 ? `₹${advice.ledger.costInrMonth} saved` : `₹${Math.abs(advice.ledger.costInrMonth)}`}.`,
        ]),
        suggestions: [
          "What can I do for free today?",
          "Is an expensive purifier worth it?",
          "How do I lower my commute emissions?",
        ],
      };
    }
    case "community": {
      return {
        mode: "local",
        answer: joinLines([
          "Air is shared, so the highest-leverage community moves are the ones that change a rule or a shared space — not another individual checklist.",
          "Start with three:\n• No burning of leaves, waste or plastic in the compound; report a roadside fire on your municipal channel.\n• No idling at the school gate or building entrance.\n• One filtered clean-air corner for children and older residents.",
          `For ${city} today, share that the cleanest window is ${best.label} at about ${displayLabel} ${best.displayAqi}. Neighbours can plan errands and outdoor play around it.`,
          "Keep the ask concrete and non-judgemental. A school or building committee can act on a simple rule faster than a hundred separate households can act alone.",
        ]),
        suggestions: [
          "How do I start a clean-air group?",
          "Draft a no-idling message for my building",
          "How do I report waste burning?",
        ],
      };
    }
    case "plants": {
      return {
        mode: "local",
        answer: joinLines([
          "Indoor plants are lovely, but they are not air purifiers. You would need a greenhouse-sized density to rival even a small HEPA filter, and the soil can add mould if overwatered.",
          "Spend the effort where it changes the air:\n• Close the room and use a HEPA purifier if you have one.\n• Damp-dust and avoid incense, coils and candles.\n• Use the kitchen exhaust every time you cook.",
          "Keep the plants for wellbeing and greenery. Do not count them toward your clean-room plan.",
        ]),
        suggestions: [
          "How do I choose a real purifier?",
          "What removes PM2.5 indoors?",
          "How do I make a clean room?",
        ],
      };
    }
    case "sleep": {
      return {
        mode: "local",
        answer: joinLines([
          "The bedroom is the highest-value room to protect because you spend so long there. A small, well-sealed, filtered room beats a big device in an open living room.",
          `Tonight:\n• Close the bedroom door and windows 30 minutes before bed.\n• Run the purifier high, then low overnight.\n• Damp-wipe the window sill; keep the bed away from the window.\n• Change out of outdoor clothes before getting in.`,
          profile.home.purifier === "none"
            ? "Without a purifier, the next best step is a sealed room plus damp cleaning. Do not burn incense or coils to help you sleep — that adds particles all night."
            : "Check that the purifier is not blocked by curtains or furniture, and that its filter is not overdue.",
          `At ${displayLabel} ${displayAqi}, ${mask.charAt(0).toLowerCase()}${mask.slice(1)}`,
        ]),
        suggestions: [
          "How do I stop dust at night?",
          "Is it safe to sleep with windows open?",
          "How often should I replace the filter?",
        ],
      };
    }
    default: {
      return {
        mode: "local",
        answer: joinLines([
          `${city} is at ${displayLabel} ${displayAqi} (${advice.measurement.label}). ${advice.summary}`,
          `The single most useful action today is “${top.title}”. ${top.summary}`,
          `Three things that matter now:\n• ${mask}\n• Keep windows closed during ${advice.windows.worst.label}; the cleaner window is ${best.label}.\n• ${profile.home.indoorSmoke === "none" ? "Skip candles, incense and any indoor burning." : "Skip incense, coils and any indoor burning today."}`,
          `I can go deeper on the school run, your commute, a clean room, cooking smoke, costs or community action. What is most useful?`,
        ]),
        suggestions: localSuggestions(profile),
      };
    }
  }
}
