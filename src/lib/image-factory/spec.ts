import type { ChallengeSeed } from "@/lib/domain/types";

export type ImageSpecDraft = {
  styleProfile: string;
  camera: string;
  scene: string;
  roadEnvironment: string;
  composition: string;
  mustShow: string[];
  mustNotShow: string[];
  criticalFacts: string[];
  regionRules: string[];
  prompt: string;
  negativePrompt: string;
  candidateCount: number;
  status: "ready" | "needs_review";
};

const GLOBAL_MUST_NOT_SHOW = [
  "watermarks or logos",
  "generated text overlays",
  "readable number plates",
  "dominant vehicle branding",
  "American road signs, road markings, or right-hand traffic for UK scenes",
  "shallow depth of field that hides critical road information",
  "cinematic motion blur that obscures vehicles, signs, or road geometry",
  "visual details that contradict the required driving decision",
];

function regionRules(region: string): string[] {
  if (region !== "uk") {
    return [
      "Use a plausible real-world road layout.",
      "Keep all decision-critical information clear in the central 4:5 safe area.",
    ];
  }
  return [
    "Left-hand traffic with UK lane positioning.",
    "UK road markings, signs, crossings, roundabouts, and junction geometry where relevant.",
    "No American road layouts, yellow centre lines, right-hand traffic, or US-style signs.",
    "Keep all decision-critical information clear in the central 4:5 safe area.",
  ];
}

function objectiveFacts(challenge: ChallengeSeed): string[] {
  const base = [
    `The image makes this question answerable: ${challenge.question}`,
    "The player can identify the relevant road users, hazards, lanes, and road geometry on a phone screen.",
  ];
  if (challenge.id === "rq-012") {
    return [
      "Two vehicles face each other on a narrow single-track UK country road.",
      "A visible passing place is present beside the road.",
      "The player vehicle is clearly closer to the passing place than the opposing vehicle.",
      "The camera position makes the player vehicle's relationship to the passing place unambiguous.",
    ];
  }
  return base;
}

function communityFacts(challenge: ChallengeSeed): string[] {
  return [
    `The situation is understandable without inventing a correct answer: ${challenge.question}`,
    "Relevant vehicles and the road context are visible in the central mobile-safe area.",
  ];
}

function environmentFor(challenge: ChallengeSeed): string {
  if (challenge.region === "uk") return "credible UK road environment with left-hand traffic";
  return "credible real-world road environment consistent with the challenge";
}

export function createImageSpecDraft(challenge: ChallengeSeed): ImageSpecDraft {
  const objective = challenge.challengeType === "objective";
  const criticalFacts = objective ? objectiveFacts(challenge) : communityFacts(challenge);
  const styleProfile = objective
    ? "photorealistic controlled driving-simulator educational scene"
    : "photorealistic editorial driving scene with clear documentary composition";
  const roadEnvironment = environmentFor(challenge);
  const composition = "portrait 4:5 composition, realistic eye-level driver or three-quarter roadside camera, decision-critical evidence centered with generous crop safety for RoadIQ cards";
  const mustShow = [
    ...criticalFacts,
    "Realistic road geometry and spatial relationships.",
    "Clear environmental detail with natural daylight or purposeful night lighting.",
  ];
  const prompt = [
    `Create a ${styleProfile}.`,
    `Driving challenge: ${challenge.question}`,
    `Scene: ${roadEnvironment}.`,
    `Composition: ${composition}.`,
    `Required visual facts: ${mustShow.join(" ")}`,
    `Regional requirements: ${regionRules(challenge.region).join(" ")}`,
    "No readable text in the image. No watermarks. No visible number plates. Keep environmental information sharp and useful on a mobile screen.",
  ].join(" ");

  return {
    styleProfile,
    camera: "eye-level 35mm-equivalent documentary driving camera with deep focus",
    scene: challenge.question,
    roadEnvironment,
    composition,
    mustShow,
    mustNotShow: GLOBAL_MUST_NOT_SHOW,
    criticalFacts,
    regionRules: regionRules(challenge.region),
    prompt,
    negativePrompt: GLOBAL_MUST_NOT_SHOW.join(", "),
    candidateCount: 3,
    status: challenge.id === "rq-012" ? "needs_review" : "ready",
  };
}
