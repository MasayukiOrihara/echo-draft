// app/api/transcribe/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

    const result = await client.audio.transcriptions.create({
      file: webmFile,
      model: "gpt-4o-mini-transcribe", // or "whisper-1"
      language: "ja",
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[transcribe] error", err);
    return NextResponse.json(
      { error: err?.message ?? "transcribe failed" },
      { status: 500 }
    );
  }
}
