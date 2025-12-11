// src/components/RecordAndTranscribe.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSegmentedRecorder } from "@/hooks/useSegmentedRecorder";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "./audio/AudioWaveform";
import { formatTime } from "@/lib/formatTime";
import { isSilentBlob } from "../lib/audio/isSilentBlob";
import { AudioSource } from "@/contents/types";
import { TopicPreviewButton } from "./TopicPreviewButton";
import { SpeakerLabelButton } from "./SpeakerLabelButton";
import { SummarizeButton } from "./SummarizeButton";

type SegmentText = {
  index: number;
  text: string;
  startMs: number; // 開始時刻（ミリ秒）
};

interface RecordAndTranscribeProps {
  source?: AudioSource; // "mic" | "system"、デフォルト mic
}

// 辞書の型
type DictionaryRule = {
  pattern: RegExp;
  replace: string;
};

// 固有名詞辞書
const DICTIONARY: DictionaryRule[] = [
  { pattern: /こーどますたー|コードマスター/gi, replace: "CodeMaster" },
  { pattern: /ふくしりんく|フクシリンク/gi, replace: "福祉リンク" },
  { pattern: /ぷりずま/gi, replace: "Prisma" },
];

// 関数
export const normalizeText = (text: string) =>
  DICTIONARY.reduce(
    (acc, rule) => acc.replace(rule.pattern, rule.replace),
    text
  );

/**
 * レコード + 変換
 * @param param0
 * @returns
 */
export function RecordAndTranscribe({
  source = "system",
}: RecordAndTranscribeProps) {
  const [segments, setSegments] = useState<SegmentText[]>([]);
  const [isSending, setIsSending] = useState(false);

  const recordingStartRef = useRef<number | null>(null);

  // 無音判定
  const isSilentBlobRef = useRef(false);

  const { isRecording, isSilent, start, stop, stream, audioCtx } =
    useSegmentedRecorder({
      source,
      segmentMs: 10_000,
      mimeType: "audio/webm",
      onSegment: async (blob, index) => {
        // 無音検知1
        if (isSilent) {
          console.log("[skip] realtime silent", index);
          return;
        }
        // 無音検知2
        if (audioCtx) {
          isSilentBlobRef.current = await isSilentBlob(blob, audioCtx);
          if (isSilentBlobRef.current) {
            console.log("[skip] blob silent", index);
            return;
          }
        }
        console.log("[RecordAndTranscribe] segment", index, "size=", blob.size);

        // ここで OpenAI API に投げる
        const formData = new FormData();
        formData.append("file", blob, `segment-${index}.webm`);

        const now = Date.now();
        const startMs =
          recordingStartRef.current != null
            ? now - recordingStartRef.current
            : 0;

        try {
          setIsSending(true);
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            console.error(
              "[RecordAndTranscribe] transcribe error",
              res.status,
              errJson
            );
            setSegments((prev) => [
              ...prev,
              { index, text: `#${index} エラー (${res.status})`, startMs },
            ]);
            return;
          }

          const data = await res.json();
          // 簡易辞書補正
          const text = normalizeText(data.text) ?? "";

          setSegments((prev) => [...prev, { index, text, startMs }]);
        } catch (e) {
          console.error("[RecordAndTranscribe] fetch error", e);
          setSegments((prev) => [
            ...prev,
            { index, text: `#${index} 通信エラー`, startMs },
          ]);
        } finally {
          setIsSending(false);
        }
      },
    });

  const handleStart = async () => {
    setSegments([]); // 新規録音ごとにリセットしたいなら
    recordingStartRef.current = Date.now();
    await start();
  };

  const handleStop = () => {
    stop();
  };

  // 全テキスト結合（必要ならここで整形）
  const fullText = segments
    .sort((a, b) => a.index - b.index)
    .map((s) => s.text)
    .join(" ");

  return (
    <div className="flex flex-col gap-4">
      {/* コントロール */}
      <div className="flex gap-2">
        <Button onClick={handleStart} disabled={isRecording}>
          {isRecording ? "録音中..." : "録音開始"}
        </Button>
        <Button
          variant="destructive"
          onClick={handleStop}
          disabled={!isRecording}
        >
          録音停止
        </Button>
      </div>

      {/* 送信中インジケータ */}
      <div className="text-xs text-muted-foreground">
        {isSending && "セグメント送信中..."}
        {!isSending &&
          isRecording &&
          (isSilent || isSilentBlobRef.current
            ? "無音なので送信待機中..."
            : "録音中...")}
        {!isRecording && !isSending && "待機中"}
      </div>

      {/* 波形を出したい場合は stream を渡す */}
      {stream && <AudioWaveform stream={stream} />}

      {/* セグメントごとのログ */}
      <div className="border rounded p-2 text-sm max-h-64 overflow-auto bg-muted/30">
        {segments.length === 0 ? (
          <div className="text-muted-foreground">
            まだ文字起こしはありません。
          </div>
        ) : (
          <ul className="space-y-1">
            {segments
              .sort((a, b) => a.index - b.index)
              .map((seg) => (
                <li key={seg.index}>
                  <span className="font-mono text-xs mr-2 text-gray-500">
                    [{formatTime(seg.startMs)}]
                  </span>
                  <span>{seg.text}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* 全文まとめて表示する用 */}
      {/* <div className="border rounded p-2 text-sm whitespace-pre-wrap bg-background">
        {fullText || "ここに全文が表示されます。"}
      </div> */}
      <div className="text-sm">
        <SpeakerLabelButton lines={segments.map((s) => s.text)} />
      </div>
      <TopicPreviewButton segments={segments} />
      <SummarizeButton segments={segments} />
    </div>
  );
}
