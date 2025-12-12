// app/api/topics/route.ts
import { TOPICS_PROMPT } from "@/contents/prompts/action.prompt";
import { TopicRequest, TopicResponse } from "@/contents/types/action.type";
import { parseTopicsWithFallback } from "@/lib/parseTopicsWithFallback";
import { gpt4oMini } from "@/llms/models.llm";
import { PromptTemplate } from "@langchain/core/prompts";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TopicRequest;

    // ガード
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
    const template = PromptTemplate.fromTemplate(TOPICS_PROMPT);
    const promptVariables = { title, mergedTranscript };

    const chain = template.pipe(gpt4oMini);
    const completion = await chain.invoke(promptVariables);

    const raw =
      typeof completion.content === "string"
        ? completion.content
        : String(completion.content);

    if (!raw?.trim()) {
      return NextResponse.json(
        { error: "Empty response from LLM" },
        { status: 500 }
      );
    }

    const topics = parseTopicsWithFallback(raw);
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
