"use node";

import { hash } from "./progression";
import { parseImageQaJson, type ImageQaPayload } from "./imageQa";

export type ImageProvider = "mock" | "gemini" | "goi";

const GOI_DEFAULT_BASE_URL = "https://api.g0i.ai/v1";

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
  if (!key) throw new Error("GEMINI_NOT_CONFIGURED");
  return key;
}

async function geminiResponse(payload: unknown): Promise<Record<string, unknown>> {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": geminiApiKey(),
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
  const choices = result.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      if (!choice || typeof choice !== "object" || Array.isArray(choice)) continue;
      const message = (choice as Record<string, unknown>).message;
      if (!message || typeof message !== "object" || Array.isArray(message)) continue;
      const content = (message as Record<string, unknown>).content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        const text = content
          .filter((part): part is Record<string, unknown> => Boolean(part) && typeof part === "object" && !Array.isArray(part))
          .map((part) => typeof part.text === "string" ? part.text : "")
          .filter(Boolean)
          .join("\n");
        if (text) return text;
      }
    }
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

function goiApiKey(): string {
  const key = process.env.GOI_API_KEY;
  if (!key) throw new Error("GOI_NOT_CONFIGURED");
  return key;
}

function goiBaseUrl(): string {
  return (process.env.GOI_BASE_URL || GOI_DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function goiRequest(path: string, payload: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${goiBaseUrl()}/${path.replace(/^\/+/, "")}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${goiApiKey()}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`GOI_REQUEST_FAILED_${response.status}`);
  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("GOI_RESPONSE_INVALID");
  return result as Record<string, unknown>;
}

function mimeTypeFromDataUri(value: string): string | null {
  const match = value.match(/^data:([^;,]+);base64,/i);
  return match?.[1] ?? null;
}

function base64Payload(value: string): string {
  const separator = value.indexOf(",");
  return value.startsWith("data:") && separator >= 0 ? value.slice(separator + 1) : value;
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
  if (buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    if (buffer.toString("ascii", 12, 16) === "VP8X" && buffer.length >= 30) {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
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

function generatedImage(bytes: Uint8Array, mimeType: string): GeneratedImage {
  const dimensions = dimensionsFromBytes(bytes);
  return {
    bytes,
    mimeType,
    width: dimensions?.width ?? 1024,
    height: dimensions?.height ?? 1280,
  };
}

async function imageFromUrl(url: string, fallbackMimeType = "image/png"): Promise<GeneratedImage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GOI_IMAGE_FETCH_FAILED_${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("GOI_IMAGE_MISSING");
  const mimeType = response.headers.get("content-type")?.split(";", 1)[0] || detectedMimeType(bytes) || fallbackMimeType;
  return generatedImage(bytes, mimeType);
}

function goiImageEntry(result: Record<string, unknown>): Record<string, unknown> | null {
  const entries = Array.isArray(result.data) ? result.data : [];
  const first = entries[0];
  return first && typeof first === "object" && !Array.isArray(first) ? first as Record<string, unknown> : null;
}

async function goiImage(input: ImageGenerationInput): Promise<GeneratedImage> {
  const result = await goiRequest("images/generations", {
    model: input.model,
    prompt: `${input.prompt}\n\nNegative requirements: ${input.negativePrompt}`,
  });
  const entry = goiImageEntry(result);
  if (!entry) throw new Error("GOI_IMAGE_MISSING");
  const encoded = typeof entry.b64_json === "string"
    ? entry.b64_json
    : typeof entry.data === "string" ? entry.data : null;
  const declaredMimeType = typeof entry.mime_type === "string"
    ? entry.mime_type
    : typeof entry.mimeType === "string" ? entry.mimeType : null;
  if (encoded) {
    const bytes = new Uint8Array(Buffer.from(base64Payload(encoded), "base64"));
    if (bytes.byteLength === 0) throw new Error("GOI_IMAGE_MISSING");
    return generatedImage(bytes, declaredMimeType ?? mimeTypeFromDataUri(encoded) ?? detectedMimeType(bytes) ?? "image/png");
  }
  if (typeof entry.url === "string" && entry.url.length > 0) return imageFromUrl(entry.url, declaredMimeType ?? "image/png");
  throw new Error("GOI_IMAGE_MISSING");
}

async function goiQa(input: ImageQaInput): Promise<ImageQaPayload> {
  const imageData = Buffer.from(input.image.bytes).toString("base64");
  const result = await goiRequest("chat/completions", {
    model: input.model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a strict visual QA reviewer for RoadIQ driving challenges. Return one JSON object only. Do not infer facts that are not visibly supported by the image.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Evaluate this RoadIQ image for mobile-safe, decision-critical visual evidence.",
              `Question: ${input.question}`,
              `Critical facts that must be visible: ${input.criticalFacts.join(" | ")}`,
              `Regional rules: ${input.regionRules.join(" | ")}`,
              "Return exactly these keys: status (pass|warning|fail), score (0-100), issues (string[]), confirmedFacts (string[]), missingFacts (string[]), contradictions (string[]), summary (string).",
              "Use fail for a contradiction, unreadable critical geometry, a watermark, readable number plates, generated text, or an American road layout in a UK scene. Use warning when the image is plausible but a human must resolve ambiguity.",
            ].join("\n"),
          },
          { type: "image_url", image_url: { url: `data:${input.image.mimeType};base64,${imageData}` } },
        ],
      },
    ],
  });
  return parseImageQaJson(outputText(result) ?? "", input.model);
}

export async function generateCandidateImage(input: ImageGenerationInput): Promise<GeneratedImage> {
  if (input.provider === "mock") return mockImage(input);
  if (input.provider === "goi") return goiImage(input);
  return geminiImage(input);
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
  if (input.provider === "mock") return mockQa(input);
  if (input.provider === "goi") return goiQa(input);
  return geminiQa(input);
}
