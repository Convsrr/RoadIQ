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

type ChallengeVisualBrief = {
  camera: string;
  scene: string;
  criticalFacts: string[];
};

const GLOBAL_MUST_NOT_SHOW = [
  "watermarks, logos, badges, or branded text",
  "readable number plates or generated text overlays",
  "American road signs, road markings, yellow centre lines, or right-hand traffic in a UK scene",
  "shallow depth of field, glare, or motion blur that hides decision-critical geometry",
  "visual details that contradict the required driving decision",
  "a dramatic or cinematic angle that makes relative position ambiguous",
];

const CHALLENGE_VISUAL_BRIEFS: Record<string, ChallengeVisualBrief> = {
  "rq-001": {
    camera: "eye-level driver viewpoint from the left lane of a UK motorway, 35mm equivalent, deep focus",
    scene: "heavy rain beginning on a three-lane UK motorway, with spray, wet reflections, a lead vehicle ahead, and a clearly visible safe following gap",
    criticalFacts: [
      "The camera vehicle is travelling in the left lane of a divided UK motorway.",
      "Heavy rain and road spray visibly reduce the margin for stopping and seeing ahead.",
      "A lead vehicle is far enough ahead that the following distance can be judged on a phone screen.",
      "The scene does not suggest that changing to the outside lane is the safer first response.",
    ],
  },
  "rq-002": {
    camera: "eye-level driver viewpoint at night, with the road ahead sharp and the rear-view mirror visible only as contextual evidence",
    scene: "a dark two-lane road at night, the clear lane ahead lit by the headlights, with a following car's dazzling lights reflected in the rear-view mirror",
    criticalFacts: [
      "The road ahead is the largest and sharpest visual field, with a readable lane path.",
      "A following vehicle's bright headlights are visibly behind the camera vehicle, not approaching from the front.",
      "The rear-view mirror is present as a distraction but does not obscure the forward road.",
      "The image supports keeping visual focus on the road ahead without implying a specific mirror adjustment is the answer.",
    ],
  },
  "rq-003": {
    camera: "three-quarter roadside camera on a winding mountain road, enough distance to show the lead vehicle, bend, and sight line",
    scene: "a lead car travelling through a winding mountain-road bend with a visible but limited sight line, safe verge, and no evidence of its speed or driver intent",
    criticalFacts: [
      "The lead vehicle's line through the bend is clearly visible, with the road continuing beyond it.",
      "The bend and sight line are visible, but a still image cannot prove speed, skill, or future behaviour.",
      "The road context supports a judgement prompt without making any answer objectively correct.",
    ],
  },
  "rq-004": {
    camera: "eye-level driver viewpoint on a UK two-way rural road approaching a blind crest, deep focus across both lanes",
    scene: "a UK rural two-way road rising to a crest that hides the far road, with the opposing lane and centre markings visible before the crest",
    criticalFacts: [
      "The road rises to a crest that blocks a full view of the opposite lane beyond it.",
      "The two-way lane geometry and centre line are clear before the crest.",
      "No vehicle or sight line proves that an overtake can be completed safely.",
      "The composition makes waiting for a full view visually defensible as the correct answer.",
    ],
  },
  "rq-005": {
    camera: "level three-quarter parking-bay camera at driver height, with the full vehicle footprint and bay lines visible",
    scene: "a supermarket car park with one car positioned across or within marked bays, adjacent bays and access space visible for a fair parking judgement",
    criticalFacts: [
      "The painted bay lines continue visibly around the parked vehicle.",
      "The vehicle's position relative to both neighbouring bays and the pedestrian/access route is easy to judge.",
      "The image presents a parking standard question without labelling the result as legally or objectively correct.",
    ],
  },
  "rq-006": {
    camera: "eye-level left-side driver viewpoint looking along a UK kerbside row, with both rear bumpers and the empty space visible",
    scene: "a UK residential street where the camera vehicle is preparing to parallel park behind a lead parked car, aligned alongside it before reversing",
    criticalFacts: [
      "The lead parked car, the empty space, and the camera vehicle are all visible in one spatial frame.",
      "The camera vehicle's rear bumper is clearly aligned with the lead car's rear bumper as the first reference position.",
      "The kerb and left-hand traffic position are unambiguous, with enough clearance to see the intended reversing path.",
    ],
  },
  "rq-007": {
    camera: "high enough three-quarter garage camera to show the front corner, wall clearance, wheel angle, and projected turning path",
    scene: "a car inside a narrow garage with its front corner close to a wall, wheels straight, and a visible strip of floor showing how clearance can be created",
    criticalFacts: [
      "The vulnerable front corner and nearby wall are both clearly visible.",
      "The wheels are straight or only minimally turned, so full lock would visibly reduce clearance.",
      "The scene shows enough space to straighten and create clearance before steering, without implying that acceleration is safe.",
    ],
  },
  "rq-008": {
    camera: "level three-quarter camera at the entrance to a tight UK city parking space, showing kerb, wheels, neighbouring vehicles, and exit clearance",
    scene: "a very tight urban parking space with a kerb close to one wheel, neighbouring vehicles, and limited door and manoeuvring clearance",
    criticalFacts: [
      "The available space, kerb distance, neighbouring cars, and likely exit path are visibly comparable.",
      "The scene communicates practical wheel, access, and clearance trade-offs without promising a universally right choice.",
      "No parking sign or legal claim is invented to force a judgement.",
    ],
  },
  "rq-009": {
    camera: "eye-level driver viewpoint approaching a UK zebra crossing, with the crossing markings, Belisha beacon, van, and blocked sight line visible",
    scene: "a UK zebra crossing partly hidden by a white van near the approach, with the kerbside pedestrian waiting area and the camera vehicle's lane clearly shown",
    criticalFacts: [
      "The zebra crossing markings and UK crossing context are recognisable.",
      "A van physically blocks the camera driver's view of the crossing approach.",
      "The blocked area is large enough that a pedestrian could emerge into the lane without being seen early.",
      "The safe expectation is represented by the obstruction and approach geometry, not by a visible pedestrian that gives away the answer.",
    ],
  },
  "rq-010": {
    camera: "eye-level driver viewpoint on a marked UK two-lane roundabout approach, aligned centrally enough to show both approach lanes and the straight-ahead exit",
    scene: "a UK two-lane roundabout with the straight-ahead exit opposite the approach, lane arrows and splitter geometry visible, but no readable sign text",
    criticalFacts: [
      "The straight-ahead exit is visibly opposite the approach rather than first or last exit.",
      "Both approach lanes, lane arrows, and the roundabout's circulating direction are clear.",
      "The left approach lane is the normal straight-ahead option unless signs or markings say otherwise.",
      "The layout is recognisably UK: left-hand approach and clockwise circulation, with no American-style geometry.",
    ],
  },
  "rq-011": {
    camera: "high three-quarter camera above a congested lane merge, showing both queues, the taper, road markings, and one usable alternating gap",
    scene: "two traffic lanes narrowing into one at a busy merge, with vehicles queued in both lanes and a clear zipper-like space where drivers can alternate",
    criticalFacts: [
      "Both lanes remain visibly usable until the taper; one lane is not falsely blocked early.",
      "The closing point and an alternating gap between vehicles are clear.",
      "The image presents merge etiquette as a community judgement rather than a universal legal verdict.",
      "No driver is shown with impossible speed, intent, or priority that a still image cannot prove.",
    ],
  },
  "rq-012": {
    camera: "eye-level driver viewpoint on a UK single-track road, wide enough to show both vehicles, the passing place, and their distances to it",
    scene: "two vehicles facing each other on a narrow UK single-track country road, with one safe passing place clearly visible beside the camera vehicle's side of the road",
    criticalFacts: [
      "Two vehicles face each other on a narrow single-track UK country road.",
      "A visible passing place is present beside the road on the camera vehicle's side.",
      "The player vehicle is clearly closer to the passing place than the opposing vehicle.",
      "The camera position makes the player's relationship to the passing place unambiguous.",
      "The road remains passable only if the vehicle nearest the safe place reverses into it; neither vehicle is already inside the place.",
    ],
  },
  "rq-013": {
    camera: "level roadside camera close enough to show the parked car door edge, passing road user, lane width, and their overlap",
    scene: "a parked car opens its door into an urban lane as a cyclist or other road user passes alongside, with the spatial conflict clearly visible",
    criticalFacts: [
      "The parked car's door visibly projects into the path of the passing road user.",
      "The passing road user's position and available clearance are clear without relying on motion blur.",
      "The image shows a moment to judge, but cannot prove speed, observation, intention, or legal liability.",
    ],
  },
  "rq-014": {
    camera: "eye-level camera at a tight UK urban junction, showing both approaching vehicles, the turning path, parked cars, and the usable reversing space",
    scene: "two vehicles meet at a narrow UK junction, one beginning a turn while the other is nearer the constrained section, with the available space visible on both sides",
    criticalFacts: [
      "The two vehicles' arrival positions and the turning vehicle's path are visible.",
      "The narrow point and at least one plausible reversing or yielding space are shown.",
      "The scene leaves etiquette open and does not invent a priority sign, legal rule, or hidden arrival order.",
    ],
  },
  "rq-015": {
    camera: "high three-quarter road camera showing two cars side by side, their lane boundaries, shared gap, and blind-area overlap",
    scene: "two cars move toward the same open lane gap at the same time, with both lane positions and the conflict point visible on a multi-lane road",
    criticalFacts: [
      "Both cars' positions relative to the lane markings and shared gap are unambiguous.",
      "The image shows the overlap that creates the judgement prompt without adding readable signals or invented driver intent.",
      "Blind spots and speed remain visually uncertain, so no answer is presented as proven fault.",
    ],
  },
  "rq-016": {
    camera: "high three-quarter camera over a dense urban queue, showing the closing lane, the queue order, taper, and the supercar's relative position",
    scene: "a distinctive but unbranded performance car moves alongside a closing traffic queue, with the lane taper and other waiting vehicles clearly visible",
    criticalFacts: [
      "The queue and closing lane are visibly established before the performance car passes through.",
      "The performance car's position relative to the queue and taper is easy to judge.",
      "The image asks for a social judgement and does not claim a legal conclusion from one frame.",
    ],
  },
  "rq-017": {
    camera: "clean rear three-quarter automotive identification shot, level camera, full silhouette and rear lamp shape sharp against a simple road background",
    scene: "an unbranded rear three-quarter sports-car view that shows the low roofline, rear-engine proportions, rear haunches, and round rear lamps of a Porsche 911 family shape",
    criticalFacts: [
      "The full rear three-quarter silhouette is visible, including the low roofline and rounded rear haunches.",
      "The rear lamp shape and engine-cover proportions support Porsche 911 family identification without a badge or text.",
      "The car is large enough in the mobile-safe centre crop for the shape comparison to be useful.",
    ],
  },
  "rq-018": {
    camera: "level front three-quarter automotive identification shot with the headlamp, kidney grille, bonnet, and shoulder line sharp",
    scene: "an unbadged BMW 5 Series F10 front three-quarter view, with the F10 headlamp shape, grille proportions, and body surfacing visible for generation comparison",
    criticalFacts: [
      "The front headlamp contour and kidney grille proportions are clearly visible.",
      "The F10 body surfacing and bonnet-to-cabin relationship can be compared without a badge or registration plate.",
      "The angle avoids confusing the F10 with an E60 or G30 by hiding the identifying front details.",
    ],
  },
  "rq-019": {
    camera: "level side-profile automotive identification shot, keeping the full wheelbase, cabin, front axle, and rear body section in frame",
    scene: "a low unbranded sports car in clean side profile, with the cabin noticeably forward and a substantial engine-bay-sized body section behind the cabin",
    criticalFacts: [
      "The complete side profile and both axles are visible.",
      "The cabin sits forward relative to the wheelbase, leaving the key mass behind it.",
      "The image communicates a mid-engine proportion rather than showing an impossible visible engine location.",
    ],
  },
  "rq-020": {
    camera: "level front three-quarter classic-supercar identification shot with the nose, headlamp housings, and period body lines sharp",
    scene: "a classic-era red supercar with pop-up headlamps visibly raised or clearly identifiable in their housings, photographed without plate text or badges",
    criticalFacts: [
      "The pop-up headlamp mechanism is the clearest visible identifying feature.",
      "The front bodywork reads as a classic-era supercar without relying on red paint, wheel colour, or a number plate.",
      "The headlamp detail remains inside the mobile-safe 4:5 crop.",
    ],
  },
  "rq-021": {
    camera: "close three-quarter used-car inspection shot with the front tyre and tread in sharp focus while retaining enough vehicle context",
    scene: "a used car parked outdoors with one front tyre prominent, showing tread blocks, sidewall condition, and uneven wear under neutral daylight",
    criticalFacts: [
      "The tyre tread and sidewall are the most inspectable details in the central crop.",
      "The full car context remains visible so the image reads as a used-car inspection rather than a generic tyre advert.",
      "The tyre condition is clear enough to justify checking it first without inventing a safety certificate or hidden defect.",
    ],
  },
  "rq-022": {
    camera: "macro-like but natural front three-quarter inspection shot of the bonnet, headlamp, and front wing with the seam in sharp focus",
    scene: "a close view of one front body panel junction with an uneven bonnet-to-wing or headlamp gap, while adjacent panels remain visible for context",
    criticalFacts: [
      "One specific panel gap is visibly uneven compared with the neighbouring seam.",
      "The bonnet, headlamp, and front wing relationship is clear enough to inspect adjacent mounting points.",
      "No dramatic crash damage proves a rejection; the image supports a closer inspection rather than certainty.",
    ],
  },
  "rq-023": {
    camera: "level full three-quarter automotive editorial shot showing wheel size, tyre sidewall, ride height, and body clearance",
    scene: "a modified performance car with lowered suspension and prominent wheels, photographed in a clean driveway or show setting where stance and workmanship can be judged",
    criticalFacts: [
      "Wheel size, tyre sidewall, ride height, and arch clearance are visible together.",
      "The modification is presented cleanly enough to support a preference judgement, not a claim about legality or roadworthiness.",
      "The composition does not use badges or text to tell the viewer how to feel about the build.",
    ],
  },
  "rq-024": {
    camera: "editorial three-quarter garage composition with the wheel, analogue gauges, and exhaust area all visible but not artificially spotlighted",
    scene: "a detailed performance car in a garage with a visible wheel design, analogue instrument cluster, and exhaust hardware presented as separate details for personal preference",
    criticalFacts: [
      "The wheel design and analogue gauges are visibly inspectable in the central crop.",
      "The exhaust hardware is visible as a design detail, but the image does not pretend to prove its sound.",
      "The scene invites a personal choice and does not imply that one detail is objectively best.",
    ],
  },
};

function regionRules(region: string): string[] {
  if (region !== "uk") {
    return [
      "Use a plausible real-world road or vehicle environment consistent with the challenge.",
      "Keep every decision-critical object, edge, lane, and spatial relationship inside the central portrait safe area.",
    ];
  }
  return [
    "This is a UK scene: drive on the left and keep every vehicle in UK left-hand traffic positions.",
    "Use UK road markings, signs, crossings, roundabouts, kerbs, and junction geometry where relevant.",
    "Do not use American road layouts, yellow centre lines, right-hand traffic, US-style signs, or US-style junction geometry.",
    "Keep every decision-critical object, edge, lane, and spatial relationship inside the central portrait safe area.",
  ];
}

function challengeBrief(challenge: ChallengeSeed): ChallengeVisualBrief {
  return CHALLENGE_VISUAL_BRIEFS[challenge.id] ?? {
    camera: "eye-level documentary road camera with deep focus",
    scene: "a plausible real-world road or vehicle scene that directly presents the challenge",
    criticalFacts: [],
  };
}

export function createImageSpecDraft(challenge: ChallengeSeed): ImageSpecDraft {
  const objective = challenge.challengeType === "objective";
  const brief = challengeBrief(challenge);
  const correctAnswer = challenge.correctAnswerId
    ? challenge.answers.find((answer) => answer.id === challenge.correctAnswerId)?.text
    : null;
  const criticalFacts = [
    ...brief.criticalFacts,
    objective
      ? `The visible evidence must support the objective answer without requiring hidden context: ${correctAnswer ?? "the selected answer"}.`
      : "The image must make the judgement scenario clear without implying a single objectively correct verdict.",
    "All critical spatial relationships must remain legible in the central 4:5 mobile crop.",
  ];
  const styleProfile = objective
    ? "photorealistic controlled driving-simulator educational scene"
    : "photorealistic editorial driving or automotive judgement scene";
  const roadEnvironment = challenge.region === "uk"
    ? "credible UK road or vehicle environment with left-hand traffic"
    : "credible real-world road or vehicle environment consistent with the challenge";
  const composition = "portrait 4:5 composition, natural eye-level or clearly justified three-quarter camera, deep focus, decision-critical evidence centred with generous crop safety for RoadIQ cards";
  const mustShow = [
    ...criticalFacts,
    "Natural perspective and realistic scale between all vehicles, road users, markings, and fixed objects.",
    "Neutral lighting that keeps road edges, tyres, lane markings, and relevant vehicle details readable on a phone.",
  ];
  const prompt = [
    `Create a ${styleProfile}, not a poster, diagram, or stylised illustration.`,
    `Challenge question: ${challenge.question}`,
    `Specific scene: ${brief.scene}.`,
    `Camera: ${brief.camera}.`,
    `Environment: ${roadEnvironment}.`,
    `Composition: ${composition}.`,
    `Required visual facts: ${mustShow.join(" ")}`,
    `Regional requirements: ${regionRules(challenge.region).join(" ")}`,
    "Keep the image natural and information-rich. Do not add text to explain the answer; the road geometry or vehicle detail must carry the evidence.",
  ].join(" ");

  return {
    styleProfile,
    camera: brief.camera,
    scene: brief.scene,
    roadEnvironment,
    composition,
    mustShow,
    mustNotShow: [...GLOBAL_MUST_NOT_SHOW],
    criticalFacts,
    regionRules: regionRules(challenge.region),
    prompt,
    negativePrompt: GLOBAL_MUST_NOT_SHOW.join(", "),
    candidateCount: 3,
    status: challenge.id === "rq-012" ? "needs_review" : "ready",
  };
}
