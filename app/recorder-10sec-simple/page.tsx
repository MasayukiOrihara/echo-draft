"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "@/components/audio/AudioWaveform";

type Status = "idle" | "recording";

export default function Recorder10SecSimple() {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const intervalIdRef = useRef<number | null>(null);

  // 🔥 ここで API を叩く
  const sendSnapshot = async () => {
    if (chunksRef.current.length === 0) return;

    const blob = new Blob(chunksRef.current, {
      type: "audio/webm;codecs=opus",
    });

    console.log("[recorder] send snapshot, blob size:", blob.size);

    const form = new FormData();
    form.append("file", blob, "recording.webm");

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      console.log("[recorder] /api/transcribe status:", res.status);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error("[recorder] transcribe error", errJson);
        return;
      }

      const json = await res.json();
      const text = json.text ?? "";

      // 「ここまでの全文」が返ってくる想定なので、そのまま差し替え
      if (text) {
        setTranscript(text);
      }
    } catch (e) {
      console.error("[recorder] fetch error", e);
    }
  };

  const startRecording = async () => {
    if (status === "recording") return;

    try {
      console.log("[recorder] startRecording");
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(s);

      const mr = new MediaRecorder(s, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size <= 0) return;
        chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        console.log("[recorder] mediaRecorder stopped");
        s.getTracks().forEach((t) => t.stop());
        setStream(null);

        if (intervalIdRef.current !== null) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }

        setStatus("idle");

        // 最後にもう一回スナップショット送る
        void sendSnapshot();
      };

      mr.start(); // ✅ timeslice なしでスタート
      mediaRecorderRef.current = mr;
      setStatus("recording");
      console.log("[recorder] recorder started");

      // ✅ 10秒ごとに「全部入り」のスナップショットを送る
      intervalIdRef.current = window.setInterval(() => {
        void sendSnapshot();
      }, 10_000);
    } catch (err) {
      console.error("[recorder] startRecording error", err);
      alert("マイクへのアクセスに失敗しました（https か localhost 必須）");
    }
  };

  const stopRecording = () => {
    console.log("[recorder] stopRecording");
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    mr.stop();
    mediaRecorderRef.current = null;

    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  };

  const isRecording = status === "recording";

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-bold">
        🎙️ 10秒ごと全文スナップショット文字起こし（シンプル版）
      </h1>

      {/* 操作ボタン */}
      <div className="flex items-center gap-4">
        {isRecording ? (
          <Button variant="destructive" onClick={stopRecording}>
            ⏹ 録音停止
          </Button>
        ) : (
          <Button onClick={startRecording}>🔴 録音開始</Button>
        )}

        <span className="text-sm text-muted-foreground">
          状態：{isRecording ? "録音中" : "待機中"}
        </span>
      </div>

      {/* 波形 */}
      <div>
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">
          波形プレビュー
        </h2>
        <div className="rounded-md border bg-black/90 p-2">
          <AudioWaveform
            stream={stream}
            active={isRecording}
            width={600}
            height={120}
            className="w-full"
          />
        </div>
      </div>

      {/* テキスト */}
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
