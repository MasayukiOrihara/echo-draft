// app/api/transcribe/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// 共通のNGフレーズ
const GLOBAL_EXCLUDE_PATTERNS = [
  "ご視聴ありがとうございました",
  "ご清聴ありがとうございました",
  "最後までご覧いただき",
  "チャンネル登録よろしく",
  "次回をお楽しみに。",
  "最後までご視聴頂きありがとうございました。",
  "最後までご視聴頂きありがとうございました",
  "本日はご覧いただきありがとうございます。",
];

function sanitizeByPatterns(text: string, patterns: string[]): string {
  let result = text;
  for (const phrase of patterns) {
    result = result.replace(new RegExp(phrase, "g"), "");
  }
  return result.trim();
}

/**
 * 音声チャンクを処理して文字列に書き出す
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const blob = formData.get("file");

    if (!(blob instanceof Blob)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    console.log("[server blob]", "size=", blob.size, "type=", blob.type);

    const webmFile = new File([blob], "chunk.webm", {
      type: "audio/webm",
    });

    // or "whisper-1"
    // gpt-4o-mini-transcribe
    const result = await client.audio.transcriptions.create({
      file: webmFile,
      model: "whisper-1", // or "whisper-1"
      language: "ja",

      temperature: 0,
      timestamp_granularities: ["segment"],
    });

    // ハルネーションを削除
    const whisperText = result.text;
    let cleaned = sanitizeByPatterns(whisperText, GLOBAL_EXCLUDE_PATTERNS);

    return NextResponse.json({ text: cleaned });
  } catch (err: any) {
    console.error("[transcribe] error", err);
    return NextResponse.json(
      { error: err?.message ?? "transcribe failed" },
      { status: 500 }
    );
  }
}
