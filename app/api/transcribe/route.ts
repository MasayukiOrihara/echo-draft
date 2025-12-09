import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const blob = formData.get("file") as Blob | null;

    console.log("🐶");

    if (!blob) {
      return NextResponse.json({ error: "file not provided" }, { status: 400 });
    }

    // デバッグ用：サイズとタイプを確認
    console.log(
      "[transcribe] blob size:",
      blob.size,
      "type:",
      (blob as any).type
    );

    if (blob.size === 0) {
      return NextResponse.json({ error: "file is empty" }, { status: 400 });
    }

    // Blob → ArrayBuffer → Buffer 変換（Node用）
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // OpenAI 推奨の toFile ユーティリティを使う
    const file = await OpenAI.toFile(buffer, "recording.webm");

    const result = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe", // or "whisper-1"
      language: "ja",
    });

    console.log("[transcribe] success");
    return NextResponse.json({ text: (result as any).text ?? "" });
  } catch (err: any) {
    console.error("[transcribe] error", err);
    // OpenAI からのレスポンス詳細があればここでログる
    return NextResponse.json(
      { error: "transcription failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
