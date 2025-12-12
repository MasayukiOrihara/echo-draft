// app/api/summary/route.ts
import { SUMMARY_PROMPT } from "@/contents/prompts/action.prompt";
import { SummaryRequest, SummaryResponse } from "@/contents/types/action.type";
import { gpt4oMini } from "@/llms/models.llm";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { NextRequest, NextResponse } from "next/server";

// string のパサー
const parser = new StringOutputParser();

/**
 * 要約を行う
 * @param req
 * @returns
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SummaryRequest;

    // ガード
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

    const template = PromptTemplate.fromTemplate(SUMMARY_PROMPT);
    const promptVariables = { title, merged };

    const chain = template.pipe(gpt4oMini).pipe(parser);
    const completion = await chain.invoke(promptVariables);

    const summary = completion;

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
