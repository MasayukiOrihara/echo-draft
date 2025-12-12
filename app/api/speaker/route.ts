// app/api/speaker/route.ts
import { SPEAKER_PROMPT } from "@/contents/prompts/action.prompt";
import { ConversationSchema } from "@/contents/schema/conversation.schema";
import {
  SegmentText,
  SpeakerLabelRequest,
  SpeakerLabelResponse,
} from "@/contents/types/action.type";
import { gpt4oMini } from "@/llms/models.llm";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { NextRequest, NextResponse } from "next/server";

// json パサー
const parser = StructuredOutputParser.fromZodSchema(ConversationSchema);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SpeakerLabelRequest;

    // ガード
    if (!body.lines || body.lines.length === 0) {
      return NextResponse.json({ error: "lines is required" }, { status: 400 });
    }

    const title = body.title ?? "会議";

    // 行番号付きテキストを作る（プロンプトの中で参照しやすくするため）
    const numbered = body.lines
      .map((line, i) => `${i + 1}. ${line}`)
      .join("\n");

    const template = PromptTemplate.fromTemplate(SPEAKER_PROMPT);
    const promptVariables = {
      title,
      numbered,
      format_instructions: parser.getFormatInstructions(),
    };

    const chain = template.pipe(gpt4oMini).pipe(parser);
    const completion = await chain.invoke(promptVariables);

    const raw = completion;
    if (!raw) {
      return NextResponse.json(
        { error: "Empty response from OpenAI" },
        { status: 500 }
      );
    }

    const segments: SegmentText[] = raw.segments.map((s, i) => ({
      index: i,
      text: s.text,
      speaker: s.speaker,
    }));

    const res: SpeakerLabelResponse = { segments };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    console.error("[speaker] error", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
