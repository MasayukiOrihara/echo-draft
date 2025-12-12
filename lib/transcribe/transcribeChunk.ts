// lib/transcribe/transcribeChunk.ts
import OpenAI from "openai";
import { sanitizeByPatterns } from "@/lib/cleaner/sanitizeByPatterns";
import { GLOBAL_EXCLUDE_PATTERNS } from "@/contents/disctionary/globalExcludePatterns.disctionary";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function transcribeChunk(blob: Blob) {
  const file = new File([blob], "chunk.webm", { type: "audio/webm" });

  const result = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "ja",
    temperature: 0,
    timestamp_granularities: ["segment"],
  });

  return sanitizeByPatterns(result.text ?? "", GLOBAL_EXCLUDE_PATTERNS);
}
