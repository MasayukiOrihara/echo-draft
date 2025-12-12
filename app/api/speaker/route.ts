// app/api/speaker/route.ts
import {
  SegmentText,
  SpeakerLabelRequest,
  SpeakerLabelResponse,
} from "@/contents/types/action.type";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
あなたは会話の書き起こしから話者を推定してラベリングし、
さらに人間が読みやすい会話文に整形するアシスタントです。

【タスク】
- 入力として、複数人で話している会話ログが与えられます。
- 各行について、「話者1」「話者2」「話者3」... のようなラベルを付けてください。
- 同じ人物が話していると判断した行には、同じ 話者 ラベルを付けてください。
- 誰が誰かは音声からは分からないので、言葉遣いや文脈から一貫性のある形で推定してください。
- ラベル名は必ず "話者1", "話者2", ... の形式にしてください（日本語名にはしない）。

【整形・要約ルール】
- 会話全体として、ある程度意味が通るように内容を要約しつつ、自然な日本語の会話文に整形してください。
- 「えー」「あのー」などのフィラーや明らかな言い直しは適度に削除して構いません。
- 文末表現や句読点を整えて、読みやすい文章にしてください。
- 同じ話者の発話が連続している場合は、1つの発言としてまとめても構いません（formatted_conversation 内のみ）。
- ただし、誰が何を言ったかという情報は変えないでください。

【出力形式】
必ず次の JSON オブジェクト形式で 1 つだけ出力してください（コメントは禁止）:

{
  "segments": [
    { "speaker": "話者1", "text": "1行目のテキスト（元の行そのまま）" },
    { "speaker": "話者2", "text": "2行目のテキスト（元の行そのまま）" }
  ],
  "formatted_conversation": "ここに、話者ラベル付きで整形・要約した会話文を入れる。\\n話者1：...\\n話者2：..."
}

- segments の順番は、入力行の順番と同じにしてください。
- segments の各 text フィールドには、入力の行のテキストそのものをそのまま入れてください（内容を書き換えない）。
- formatted_conversation には、整形・要約した日本語の会話文を入れてください。
  - 例: "話者1：昨日のミーティング資料、もう一度共有してもらえますか？\\n話者2：はい、あとでメールで送ります。"

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

    let segments: SegmentText[] = [];
    try {
      const parsed = JSON.parse(raw) as { segments?: SegmentText[] };
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
