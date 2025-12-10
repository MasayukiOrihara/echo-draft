// src/components/RecordAndTranscribe.tsx
"use client";

import { useState } from "react";
import {
  useSegmentedRecorder,
  AudioSource,
} from "@/hooks/useSegmentedRecorder";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "./audio/AudioWaveform";

type SegmentText = {
  index: number;
  text: string;
};

interface RecordAndTranscribeProps {
  source?: AudioSource; // "mic" | "system"、デフォルト mic
}

export function RecordAndTranscribe({
  source = "mic",
}: RecordAndTranscribeProps) {
  const [segments, setSegments] = useState<SegmentText[]>([]);
  const [isSending, setIsSending] = useState(false);

  const { isRecording, start, stop, stream } = useSegmentedRecorder({
    source,
    segmentMs: 10_000, // 10秒ごと
    mimeType: "audio/webm",
    onSegment: async (blob, index) => {
      console.log("[RecordAndTranscribe] segment", index, "size=", blob.size);

      // ここで OpenAI API に投げる
      const formData = new FormData();
      formData.append("file", blob, `segment-${index}.webm`);

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
            { index, text: `#${index} エラー (${res.status})` },
          ]);
          return;
        }

        const data = await res.json();
        const text = data.text ?? "";

        setSegments((prev) => [...prev, { index, text }]);
      } catch (e) {
        console.error("[RecordAndTranscribe] fetch error", e);
        setSegments((prev) => [
          ...prev,
          { index, text: `#${index} 通信エラー` },
        ]);
      } finally {
        setIsSending(false);
      }
    },
  });

  const handleStart = async () => {
    setSegments([]); // 新規録音ごとにリセットしたいなら
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
      {isSending && (
        <div className="text-xs text-muted-foreground">
          セグメントを送信中...
        </div>
      )}

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
                  <span className="font-mono text-xs mr-2">#{seg.index}</span>
                  <span>{seg.text}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* 全文まとめて表示する用 */}
      <div className="border rounded p-2 text-sm whitespace-pre-wrap bg-background">
        {fullText || "ここに全文が表示されます。"}
      </div>
    </div>
  );
}
