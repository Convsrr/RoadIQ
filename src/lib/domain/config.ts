import type { Category, Difficulty } from "@/lib/domain/types";

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  Easy: 5,
  Medium: 10,
  Hard: 15,
  Expert: 25,
};

export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = {
  Easy: 1,
  Medium: 1.25,
  Hard: 1.5,
  Expert: 2,
};

export const COMMUNITY_XP = 5;
export const DAILY_COMPLETION_XP = 50;
export const CALIBRATION_ATTEMPTS = 5;

export const RANKS = [
  { name: "Rookie", threshold: 0 },
  { name: "Road Ready", threshold: 90 },
  { name: "Experienced", threshold: 105 },
  { name: "Advanced", threshold: 115 },
  { name: "Expert", threshold: 125 },
  { name: "Road Master", threshold: 140 },
  { name: "Elite", threshold: 150 },
] as const;

export const CATEGORY_DIMENSION_LABELS: Record<Category, string> = {
  "Driver IQ": "Driving judgement",
  "Parking IQ": "Parking IQ",
  "Road IQ": "Road awareness",
  "Who's Wrong?": "Driving judgement",
  "Car IQ": "Car knowledge",
  "Spot It": "Hazard detection",
};
