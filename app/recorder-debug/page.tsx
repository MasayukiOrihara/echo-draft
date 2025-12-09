"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function RecorderDebugPage() {
  const [log, setLog] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const pushLog = (msg: string) => {
    console.log("[recorder-debug]", msg);
    setLog((prev) => [...prev, msg]);
  };

  const startRecording = async () => {
    pushLog("startRecording clicked");

    if (!("mediaDevices" in navigator)) {
      pushLog("navigator.mediaDevices がありません");
      alert("このブラウザでは録音が使えません");
      return;
    }

    try {
      pushLog("getUserMedia 呼び出し");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pushLog("getUserMedia 成功");

      const mr = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      pushLog("MediaRecorder 生成成功");

      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        pushLog(`ondataavailable fired: size=${e.data.size}`);
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = () => {
        pushLog("MediaRecorder onstop");
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        pushLog(`録音終了 blob size=${blob.size}`);
      };

      mr.start(); // timeslice なし
      mediaRecorderRef.current = mr;
      pushLog("MediaRecorder start 呼び出し済み");
    } catch (err) {
      console.error("[recorder-debug] getUserMedia error", err);
      pushLog(`getUserMedia / MediaRecorder error: ${String(err)}`);
      alert("マイクの取得に失敗しました（許可されていないかも）");
    }
  };

  const stopRecording = () => {
    pushLog("stopRecording clicked");
    const mr = mediaRecorderRef.current;
    if (!mr) {
      pushLog("MediaRecorder が null です");
      return;
    }
    mr.stop();
    mediaRecorderRef.current = null;
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">🎙️ Recorder Debug</h1>

      <div className="flex gap-4">
        <Button onClick={startRecording}>🔴 録音開始（デバッグ）</Button>
        <Button variant="destructive" onClick={stopRecording}>
          ⏹ 録音停止
        </Button>
      </div>

      <div className="mt-4">
        <h2 className="font-semibold text-sm mb-1">ログ（最新が下）</h2>
        <div className="h-60 w-full rounded-md border bg-background p-2 text-xs overflow-auto whitespace-pre-wrap">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
