import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return NextResponse.json({ error: "file not found" }, { status: 400 });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe", // whisper-1 でもOK
    language: "ja",
  });

  return NextResponse.json({ text: (result as any).text ?? "" });
}
