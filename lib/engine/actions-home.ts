import type { PlanAction } from "../types";
import { makeAction, type AdviceContext } from "./context";

function buildPurifierAction(ctx: AdviceContext): PlanAction {
  const { profile, high } = ctx;
  if (profile.home.purifier === "none") {
    const budgetCost =
      profile.budget === "lean" ? -220 : profile.budget === "comfortable" ? -650 : -380;
    return makeAction({
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
    });
  }

  return makeAction({
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
    why: "A purifier working against an open window is mostly filtering the neighbourhood. Closing the room and matching the clean-air delivery rate to its size is what changes the air a person actually breathes.",
    effort: "easy",
    exposurePct: 9,
    co2eKgMonth: 7,
    costInrMonth: -90,
    tags: ["purifier", "filter", "indoor air"],
    score: 42,
  });
}

function buildVentilationAction(ctx: AdviceContext): PlanAction | null {
  const { profile, atmosphere, bestWindow, high, severe } = ctx;
  if (
    !severe &&
    (profile.home.ventilation === "sealed" || atmosphere.dispersionLabel === "Good")
  ) {
    const airingWindow = atmosphere.bestVentilationWindow?.label ?? bestWindow;
    return makeAction({
      id: "airing",
      title:
        atmosphere.dispersionLabel === "Good"
          ? "Use the breeze to air the house"
          : "Use the cleanest hour to air the house",
      slot: "midday",
      timeLabel: airingWindow,
      category: "home",
      priority: "today",
      summary:
        "A short cross-breeze at the right time clears stale indoor air without inviting in the worst of the day.",
      steps: [
        `Open opposite windows for 10–15 minutes around ${airingWindow}.`,
        "Move the purifier to another room or switch it off while windows are open.",
        "Close up again before the evening traffic peak.",
      ],
      why:
        "Homes trap CO₂, cooking moisture and volatile chemicals as well as particles. Timed ventilation improves the things a filter cannot remove, without paying for it with a window full of traffic smoke. Today's dispersion is modelled as " +
        atmosphere.dispersionLabel.toLowerCase() +
        ".",
      effort: "easy",
      exposurePct: atmosphere.dispersionLabel === "Good" ? 5 : 4,
      co2eKgMonth: 0,
      costInrMonth: 0,
      tags: ["ventilation", "CO2", "timing", "weather"],
      score: atmosphere.dispersionLabel === "Good" ? 34 : 30,
    });
  }

  if (high) {
    return makeAction({
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
      why: "Outdoor PM2.5 is small enough to travel indoors and can accumulate when the air is still. Closing up during the morning peak reduces the particles your purifier or lungs have to handle.",
      effort: "easy",
      exposurePct: 8,
      co2eKgMonth: 0,
      costInrMonth: 0,
      tags: ["windows", "morning peak", "indoor air"],
      score: 48,
    });
  }

  return null;
}

function buildCookingAction(ctx: AdviceContext): PlanAction | null {
  const { cookingFuel } = ctx.profile.home;
  if (cookingFuel === "biomass") {
    return makeAction({
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
      why: "Solid-fuel smoke is a major source of household PM2.5 and carbon monoxide. Replacing it reduces exposure every day, not just on smoggy ones — and it is often the biggest single health gain in the home.",
      effort: "commitment",
      exposurePct: 20,
      co2eKgMonth: 6,
      costInrMonth: -400,
      tags: ["cooking", "biomass", "clean fuel"],
      score: 69,
    });
  }

  if (cookingFuel === "lpg" || cookingFuel === "piped-gas") {
    return makeAction({
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
      why: "Gas cooking releases NO₂ and fine particles, and frying adds more. The exhaust is cheap to run and removes the plume before it spreads into bedrooms. A lid also cuts both energy use and splatter.",
      effort: "easy",
      exposurePct: 6,
      co2eKgMonth: 2.4,
      costInrMonth: 90,
      tags: ["cooking", "exhaust", "NO2"],
      score: 37,
    });
  }

  return null;
}

export function buildHomeActions(ctx: AdviceContext): PlanAction[] {
  const { profile, atmosphere, severe } = ctx;
  const actions: PlanAction[] = [buildPurifierAction(ctx)];

  const ventilation = buildVentilationAction(ctx);
  if (ventilation) actions.push(ventilation);

  if (atmosphere.inversionRisk === "high" && !severe) {
    actions.push(
      makeAction({
        id: "wait-for-wind",
        title: "Wait for the wind before opening up",
        slot: "morning",
        timeLabel: "Before the evening peak",
        category: "home",
        priority: "today",
        summary:
          "The air is still and humid, so smoke and particles are lingering near the ground. Keep the sealed-room routine going until mixing improves.",
        steps: [
          "Keep street-facing windows and doors closed through the morning.",
          "Run the purifier on low in the room you use most, with the door closed.",
          "If you must air the room, use the shortest possible cross-breeze and close up again.",
          `Recheck the dispersion outlook before the next airing${atmosphere.bestVentilationWindow ? `; the best modelled window is ${atmosphere.bestVentilationWindow.label}` : ""}.`,
        ],
        why: "Cold, humid, still air can trap pollution in a shallow layer near the ground. Under those conditions a window can bring in more particles than it clears, even when the sky looks brighter.",
        effort: "easy",
        exposurePct: 5,
        co2eKgMonth: 0,
        costInrMonth: 0,
        tags: ["inversion", "windows", "ventilation"],
        score: 40,
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
        why: "Combustion particles are ultra-fine and land deep in the lungs. A stick of incense or a mosquito coil can push a small room's PM2.5 above the outdoor reading, undoing the day's protection in minutes.",
        effort: "easy",
        exposurePct: 10,
        co2eKgMonth: 0.6,
        costInrMonth: 0,
        tags: ["smoke-free", "incense", "coils"],
        score: 51,
      }),
    );
  }

  const cooking = buildCookingAction(ctx);
  if (cooking) actions.push(cooking);

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
      why: "Settled dust is a reservoir of particles and allergens. Wet cleaning removes it instead of resuspending it, and it is free. Skip air fresheners — they add VOCs rather than removing anything.",
      effort: "easy",
      exposurePct: 5,
      co2eKgMonth: 0,
      costInrMonth: 0,
      tags: ["dust", "cleaning", "allergens"],
      score: 29,
    }),
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
      why: "People spend roughly a third of their lives in the bedroom. Reducing overnight PM2.5 while the body rests is a high-value, low-effort part of a smog-day routine, especially for a child or older adult.",
      effort: "easy",
      exposurePct: 8,
      co2eKgMonth: 2,
      costInrMonth: -60,
      tags: ["sleep", "bedroom", "purifier"],
      score: 45,
    }),
  );

  return actions;
}
