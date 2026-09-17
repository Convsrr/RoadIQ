export type ImageQaPayload = {
  status: "pass" | "warning" | "fail";
  score: number;
  issues: string[];
  confirmedFacts: string[];
  missingFacts: string[];
  contradictions: string[];
  summary: string;
  model: string;
};

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 500)).slice(0, 30)
    : [];
}

function score(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : 0;
}

export function parseImageQaPayload(value: unknown, model: string): ImageQaPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      status: "warning",
      score: 0,
      issues: ["The QA provider returned an unreadable result. Review this candidate manually."],
      confirmedFacts: [],
      missingFacts: [],
      contradictions: [],
      summary: "QA response could not be parsed.",
      model,
    };
  }
  const source = value as Record<string, unknown>;
  const missingFacts = stringList(source.missingFacts);
  const contradictions = stringList(source.contradictions);
  const requestedStatus = source.status;
  const status = requestedStatus === "pass" || requestedStatus === "warning" || requestedStatus === "fail"
    ? requestedStatus
    : missingFacts.length > 0 || contradictions.length > 0 ? "warning" : "warning";
  return {
    status,
    score: score(source.score),
    issues: stringList(source.issues),
    confirmedFacts: stringList(source.confirmedFacts),
    missingFacts,
    contradictions,
    summary: typeof source.summary === "string" ? source.summary.slice(0, 1_000) : "QA result requires human review.",
    model,
  };
}

export function parseImageQaJson(value: string, model: string): ImageQaPayload {
  try {
    return parseImageQaPayload(JSON.parse(value), model);
  } catch {
    return parseImageQaPayload(null, model);
  }
}
