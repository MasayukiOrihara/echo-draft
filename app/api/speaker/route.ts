// app/api/speaker/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SpeakerLabelRequest = {
  lines: string[];
  title?: string;
};

type SpeakerSegment = {
  speaker: string;
  text: string;
};

type SpeakerLabelResponse = {
  segments: SpeakerSegment[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SpeakerLabelRequest;

    if (!body.lines || body.lines.length === 0) {
      return NextResponse.json({ error: "lines is required" }, { status: 400 });
    }

    const title = body.title ?? "会議";

    // 行番号付きテキストを作る（プロンプトの中で参照しやすくするため）
    const numbered = body.lines
      .map((line, i) => `${i + 1}. ${line}`)
      .join("\n");

    const prompt = `
あなたは会話の書き起こしから話者を推定してラベリングするアシスタントです。

【タスク】
- 入力として、1行ごとに1人が話している会話ログが与えられます。
- 各行について、「Speaker1」「Speaker2」「Speaker3」... のようなラベルを付けてください。
- 同じ人物が話していると判断した行には、同じ Speaker ラベルを付けてください。
- 誰が誰かは音声からは分からないので、言葉遣いや文脈から一貫性のある形で推定してください。
- ラベル名は必ず "話者1", "話者2", ... の形式にしてください（日本語名にはしない）。

【出力形式】
必ず次の JSON オブジェクト形式で 1 つだけ出力してください（コメントは禁止）:

{
  "segments": [
    { "speaker": "話者1", "text": "1行目のテキスト" },
    { "speaker": "話者2", "text": "2行目のテキスト" }
  ]
}

- segments の順番は、入力行の順番と同じにしてください。
- text フィールドには、入力の行のテキストそのものをそのまま入れてください（内容を書き換えない）。

【会議タイトル】${title}

【会話ログ（行番号付き）】
${numbered}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 好きなモデルに変えてOK
      messages: [
        {
          role: "system",
          content:
            "あなたは日本語の会話書き起こしから話者ラベルを推定するアシスタントです。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" }, // JSON強制
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "Empty response from OpenAI" },
        { status: 500 }
      );
    }

    let segments: SpeakerSegment[] = [];
    try {
      const parsed = JSON.parse(raw) as { segments?: SpeakerSegment[] };
      segments = parsed.segments ?? [];
    } catch (e) {
      console.error("[speaker] JSON parse error", e, raw);
      return NextResponse.json(
        { error: "Failed to parse JSON from model" },
        { status: 500 }
      );
    }

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
