// app/api/summary/route.ts
import { SummaryRequest, SummaryResponse } from "@/contents/types/action.type";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SummaryRequest;

    if (!body.segments || body.segments.length === 0) {
      return NextResponse.json(
        { error: "segments is required" },
        { status: 400 }
      );
    }

    const title = body.title ?? "会議";
    const merged = body.segments
      .sort((a, b) => a.index - b.index)
      .map((s) => s.text.trim())
      .filter((t) => t.length > 0)
      .join("\n");

    const prompt = `
あなたは日本語の会議議事録アシスタントです。
以下の書き起こしテキストを、重要なポイントが分かるように要約してください。

要件:
- 日本語で簡潔にまとめる
- 箇条書き中心で 5〜10 行程度
- 可能であれば「決定事項」「TODO」も含める
- 出力は必ず次のJSON形式ひとつだけ（コメント禁止）

{
  "summary": "ここに要約テキスト"
}

【会議タイトル】${title}

【書き起こしテキスト】:
${merged}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたは日本語の会議議事録から要約を作成するアシスタントです。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "Empty response from OpenAI" },
        { status: 500 }
      );
    }

    let summary = "";
    try {
      const parsed = JSON.parse(raw) as { summary?: string };
      summary = parsed.summary ?? "";
    } catch (e) {
      console.error("[summary] JSON parse error", e, raw);
      return NextResponse.json(
        { error: "Failed to parse JSON from model" },
        { status: 500 }
      );
    }

    const res: SummaryResponse = { summary };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    console.error("[summary] error", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
