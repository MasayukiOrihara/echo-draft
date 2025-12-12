// app/api/transcribe/route.ts
import { NextResponse } from "next/server";
import { transcribeChunk } from "@/lib/transcribe/transcribeChunk";

export async function POST(req: Request) {
  const formData = await req.formData();
  const blob = formData.get("file");
  if (!(blob instanceof Blob)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  const text = await transcribeChunk(blob);
  return NextResponse.json({ text });
}
