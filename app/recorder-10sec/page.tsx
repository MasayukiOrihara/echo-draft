"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "@/components/audio/AudioWaveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

/**
 * 表示 + 文字起こしロジック
 * @returns
 */
export default function Recorder10SecPage() {
  const [transcript, setTranscript] = useState("");

  // ここで録音フックを使う
  const recorder = useAudioRecorder({
    timesliceMs: 10_000, // 10秒ごと
    onData: async (blob, index) => {
      try {
        const form = new FormData();
        form.append("file", blob, `chunk-${index}.webm`);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        const json = await res.json();
        const text = json.text ?? "";
        console.log("text: " + text);

        if (!text) return;
        setTranscript(text);
      } catch (e) {
        console.error("transcribe error", e);
      }
    },
  });

  const isRecording = recorder.status === "recording";

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-bold">
        🎙️ 10秒ごとの文字起こし（録音ロジック分離版）
      </h1>

      {/* 操作ボタン（UIだけの責務） */}
      <div className="flex items-center gap-4">
        {isRecording ? (
          <Button variant="destructive" onClick={recorder.stop}>
            ⏹ 録音停止
          </Button>
        ) : (
          <Button onClick={recorder.start}>🔴 録音開始</Button>
        )}

        <span className="text-sm text-muted-foreground">
          状態：{isRecording ? "録音中" : "待機中"}
        </span>
      </div>

      {/* 波形表示（これも UI 専用。録音ロジックは知らない） */}
      <div>
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">
          波形プレビュー
        </h2>
        <div className="rounded-md border bg-black/90 p-2">
          <AudioWaveform
            stream={recorder.stream}
            active={isRecording}
            width={600}
            height={120}
            className="w-full"
          />
        </div>
      </div>

      {/* 文字起こし結果表示コンポーネントに切り出してもOK */}
      <div>
        <h2 className="mb-1 font-semibold">📝 文字起こし</h2>
        <textarea
          className="h-64 w-full rounded-md border bg-background p-3 text-sm"
          value={transcript}
          readOnly
        />
      </div>
    </div>
  );
}
