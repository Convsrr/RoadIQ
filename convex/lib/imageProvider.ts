"use node";

import { hash } from "./progression";
import { parseImageQaJson, type ImageQaPayload } from "./imageQa";

export type ImageProvider = "mock" | "gemini";

const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

const IMAGE_QA_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["pass", "warning", "fail"] },
    score: { type: "number" },
    issues: { type: "array", items: { type: "string" } },
    confirmedFacts: { type: "array", items: { type: "string" } },
    missingFacts: { type: "array", items: { type: "string" } },
    contradictions: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: ["status", "score", "issues", "confirmedFacts", "missingFacts", "contradictions", "summary"],
} as const;

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

function geminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) throw new Error("GEMINI_NOT_CONFIGURED");
  return key;
}

function providerErrorDetail(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const error = source.error && typeof source.error === "object" && !Array.isArray(source.error)
    ? source.error as Record<string, unknown>
    : source;
  const parts = [error.status, error.code, error.message]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim());
  if (parts.length === 0) return null;
  return parts.join(" - ")
    .replace(/(?:api[-_ ]?key|token|authorization)\s*[:=]\s*\S+/gi, "credential=[redacted]")
    .slice(0, 240);
}

async function geminiResponse(payload: unknown): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(GEMINI_INTERACTIONS_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": geminiApiKey(),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("GEMINI_NETWORK_ERROR");
  }

  const raw = await response.text();
  let result: unknown = null;
  try {
    result = raw ? JSON.parse(raw) : null;
  } catch {
    result = null;
  }
  if (!response.ok) {
    const detail = providerErrorDetail(result);
    throw new Error(`GEMINI_REQUEST_FAILED_${response.status}${detail ? `: ${detail}` : ""}`);
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("GEMINI_RESPONSE_INVALID");
  return result as Record<string, unknown>;
}

function outputImage(result: Record<string, unknown>): { data: string; mimeType: string } {
  const candidates = [
    result.output_image,
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
  const steps = result.steps;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      if (!step || typeof step !== "object" || Array.isArray(step)) continue;
      const content = (step as Record<string, unknown>).content;
      if (!Array.isArray(content)) continue;
      const text = content
        .filter((part): part is Record<string, unknown> => Boolean(part) && typeof part === "object" && !Array.isArray(part))
        .map((part) => typeof part.text === "string" ? part.text : "")
        .filter(Boolean)
        .join("\n");
      if (text) return text;
    }
  }
  return null;
}

function detectedMimeType(bytes: Uint8Array): string | null {
  const buffer = Buffer.from(bytes);
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

function dimensionsFromBytes(bytes: Uint8Array): { width: number; height: number } | null {
  const buffer = Buffer.from(bytes);
  if (buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" && buffer.toString("ascii", 12, 16) === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (offset + 2 > buffer.length) break;
      const segmentLength = buffer.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
      const isSizeMarker = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
      if (isSizeMarker && offset + 7 <= buffer.length) {
        return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
      }
      offset += segmentLength;
    }
  }
  return null;
}

function generatedImage(bytes: Uint8Array, declaredMimeType: string): GeneratedImage {
  if (bytes.byteLength === 0) throw new Error("GEMINI_IMAGE_EMPTY");
  const dimensions = dimensionsFromBytes(bytes);
  if (!dimensions) throw new Error("GEMINI_IMAGE_DIMENSIONS_MISSING");
  return {
    bytes,
    mimeType: declaredMimeType.startsWith("image/") ? declaredMimeType : detectedMimeType(bytes) ?? "image/jpeg",
    width: dimensions.width,
    height: dimensions.height,
  };
}

function decodeBase64(value: string): Uint8Array {
  const bytes = new Uint8Array(Buffer.from(value, "base64"));
  if (bytes.byteLength === 0) throw new Error("GEMINI_IMAGE_EMPTY");
  return bytes;
}

async function geminiImage(input: ImageGenerationInput): Promise<GeneratedImage> {
  const result = await geminiResponse({
    model: input.model,
    input: [
      {
        type: "text",
        text: [
          input.prompt,
          `Negative requirements: ${input.negativePrompt}`,
          `Generate candidate variation ${input.candidateIndex + 1} as a portrait RoadIQ card image.`,
        ].join("\n\n"),
      },
    ],
    response_format: {
      type: "image",
      mime_type: "image/jpeg",
      aspect_ratio: "4:5",
      image_size: "1K",
    },
  });
  const image = outputImage(result);
  return generatedImage(decodeBase64(image.data), image.mimeType);
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
        type: "text",
        text: [
          "Evaluate this RoadIQ driving-challenge image for mobile-safe, decision-critical visual evidence.",
          `Question: ${input.question}`,
          `Critical facts that must be visible: ${input.criticalFacts.join(" | ")}`,
          `Regional rules: ${input.regionRules.join(" | ")}`,
          "Use fail for a contradiction, unreadable critical geometry, a watermark, readable number plates, generated text, or an American road layout in a UK scene. Use warning when the image is plausible but a human must resolve ambiguity.",
        ].join("\n"),
      },
      { type: "image", mime_type: input.image.mimeType, data },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: IMAGE_QA_SCHEMA,
    },
  });
  return parseImageQaJson(outputText(result) ?? "", input.model);
}

export async function generateCandidateImage(input: ImageGenerationInput): Promise<GeneratedImage> {
  if (input.provider === "mock") return mockImage(input);
  return geminiImage(input);
}

export async function evaluateCandidateImage(input: ImageQaInput): Promise<ImageQaPayload> {
  if (input.provider === "mock") return mockQa(input);
  return geminiQa(input);
}
