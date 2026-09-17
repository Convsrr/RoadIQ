"use node";

import { hash } from "./progression";
import { parseImageQaJson, type ImageQaPayload } from "./imageQa";

export type ImageProvider = "mock" | "gemini";

export type GeneratedImage = {
  bytes: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
};

export type ImageGenerationInput = {
  provider: ImageProvider;
  model: string;
  prompt: string;
  negativePrompt: string;
  candidateIndex: number;
};

export type ImageQaInput = {
  provider: ImageProvider;
  model: string;
  question: string;
  criticalFacts: string[];
  regionRules: string[];
  image: GeneratedImage;
};

function escapedSvg(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

function mockImage(input: ImageGenerationInput): GeneratedImage {
  const seed = hash(`${input.prompt}:${input.candidateIndex}`);
  const sky = `hsl(${seed % 360} 28% 76%)`;
  const verge = `hsl(${(seed + 96) % 360} 30% 38%)`;
  const road = `hsl(${(seed + 210) % 360} 8% 28%)`;
  const marker = `hsl(${(seed + 42) % 360} 74% 62%)`;
  const safePrompt = escapedSvg(input.negativePrompt.slice(0, 1));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500"><rect width="1200" height="1500" fill="${sky}"/><rect y="620" width="1200" height="880" fill="${verge}"/><path d="M360 1500 L840 1500 L700 560 L500 560 Z" fill="${road}"/><path d="M592 1460 L608 1460 L604 1260 L596 1260 Z M590 1180 L610 1180 L605 1030 L595 1030 Z M588 930 L612 930 L605 820 L595 820 Z" fill="#f7f5e9" opacity=".8"/><rect x="190" y="830" width="190" height="95" rx="20" fill="#27303c"/><rect x="820" y="720" width="175" height="88" rx="20" fill="#563b3d"/><rect x="255" y="770" width="135" height="65" rx="10" fill="${marker}" opacity=".9"/><path d="M420 800 L510 800 L495 690 L440 690 Z" fill="#e9ecee" opacity=".85"/><circle cx="285" cy="936" r="25" fill="#111"/><circle cx="935" cy="818" r="22" fill="#111"/><metadata>${safePrompt}</metadata></svg>`;
  return {
    bytes: new TextEncoder().encode(svg),
    mimeType: "image/svg+xml",
    width: 1200,
    height: 1500,
  };
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_NOT_CONFIGURED");
  return key;
}

async function geminiResponse(payload: unknown): Promise<Record<string, unknown>> {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey(),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`GEMINI_REQUEST_FAILED_${response.status}`);
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("GEMINI_RESPONSE_INVALID");
  return result as Record<string, unknown>;
}

function outputImage(result: Record<string, unknown>): { data: string; mimeType: string } {
  const direct = result.output_image;
  const candidates = [
    direct,
    ...(Array.isArray(result.output) ? result.output : []),
    ...(Array.isArray(result.outputs) ? result.outputs : []),
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const image = candidate as Record<string, unknown>;
    const data = typeof image.data === "string" ? image.data : null;
    const mimeType = typeof image.mime_type === "string"
      ? image.mime_type
      : typeof image.mimeType === "string" ? image.mimeType : "image/jpeg";
    if (data) return { data, mimeType };
  }
  throw new Error("GEMINI_IMAGE_MISSING");
}

function outputText(result: Record<string, unknown>): string | null {
  if (typeof result.output_text === "string") return result.output_text;
  const candidates = [
    ...(Array.isArray(result.output) ? result.output : []),
    ...(Array.isArray(result.outputs) ? result.outputs : []),
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const value = candidate as Record<string, unknown>;
    if (typeof value.text === "string") return value.text;
    if (typeof value.output_text === "string") return value.output_text;
  }
  return null;
}

async function geminiImage(input: ImageGenerationInput): Promise<GeneratedImage> {
  const result = await geminiResponse({
    model: input.model,
    input: `${input.prompt}\n\nNegative requirements: ${input.negativePrompt}`,
    response_format: {
      type: "image",
      mime_type: "image/jpeg",
      aspect_ratio: "4:5",
      image_size: "1K",
    },
  });
  const image = outputImage(result);
  return {
    bytes: new Uint8Array(Buffer.from(image.data, "base64")),
    mimeType: image.mimeType,
    width: 1024,
    height: 1280,
  };
}

export async function generateCandidateImage(input: ImageGenerationInput): Promise<GeneratedImage> {
  return input.provider === "mock" ? mockImage(input) : await geminiImage(input);
}

function mockQa(input: ImageQaInput): ImageQaPayload {
  return {
    status: "warning",
    score: 0,
    issues: ["Mock provider output is a workflow proof, not visual evidence. Human review is required."],
    confirmedFacts: [],
    missingFacts: input.criticalFacts,
    contradictions: [],
    summary: "Mock image recorded. Replace it with a credentialed generation before publishing.",
    model: "mock-qa-v1",
  };
}

async function geminiQa(input: ImageQaInput): Promise<ImageQaPayload> {
  const data = Buffer.from(input.image.bytes).toString("base64");
  const result = await geminiResponse({
    model: input.model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Evaluate this RoadIQ driving-challenge image. Return JSON only with status (pass|warning|fail), score (0-100), issues, confirmedFacts, missingFacts, contradictions, and summary. Question: ${input.question}. Required facts: ${input.criticalFacts.join(" | ")}. Regional rules: ${input.regionRules.join(" | ")}. A fail is required for any contradiction, unreadable critical geometry, watermarks, readable plates, generated text, or an American road layout in a UK scene.`,
          },
          { type: "input_image", mime_type: input.image.mimeType, data },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });
  const text = outputText(result);
  return parseImageQaJson(text ?? "", input.model);
}

export async function evaluateCandidateImage(input: ImageQaInput): Promise<ImageQaPayload> {
  return input.provider === "mock" ? mockQa(input) : await geminiQa(input);
}
