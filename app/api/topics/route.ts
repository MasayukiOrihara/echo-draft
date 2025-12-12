// app/api/topics/route.ts
import { TopicRequest, TopicResponse } from "@/contents/types/action.type";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TopicRequest;

    if (!body.segments || body.segments.length === 0) {
      return NextResponse.json(
        { error: "segments is required" },
        { status: 400 }
      );
    }

    // 1. セグメントを1本のテキストにまとめる
    const mergedTranscript = body.segments
      .sort((a, b) => a.index - b.index)
      .map((seg) => seg.text.trim())
      .filter((t) => t.length > 0)
      .join("\n");

    const title = body.title ?? "会議";

    // 2. トピック抽出用プロンプト
    const prompt = `
あなたは日本語の会議議事録アシスタントです。
以下の書き起こしテキストから、「これまで議論されたトピック」を 3〜8 個程度、短い日本語のフレーズで抽出してください。

- できるだけ具体的なトピック名にする（例:「リリース日程」「バグ対応の方針」など）
- 同じ内容を言い換えただけのものはまとめる
- JSON の配列 (string[]) だけを出してください。余計な説明は書かないでください。

【会議タイトル】${title}

【書き起こしテキスト】:
${mergedTranscript}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたは日本語の会議議事録からトピックを抽出するアシスタントです。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      // シンプルに string[] を期待するので json_object までは使わない
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "Empty response from OpenAI" },
        { status: 500 }
      );
    }

    let topics: string[] = [];
    try {
      // ``` や ```json が付いてきた場合に剥がす
      const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      topics = JSON.parse(cleaned) as string[];
    } catch (e) {
      console.error("[topics] JSON parse error", e, raw);
      // 最悪、改行区切りでバラすフォールバック
      topics = raw
        .split(/\r?\n/)
        .map((l) => l.replace(/^[-・\s]+/, "").trim())
        .filter((l) => l.length > 0);
    }

    const res: TopicResponse = { topics };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    console.error("[topics] error", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
