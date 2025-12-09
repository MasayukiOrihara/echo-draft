// hooks/useAudioRecorder.ts
"use client";

import { useCallback, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording";

type Options = {
  /** timeslice ミリ秒（例: 10秒ごとなら 10000） undefined なら stop まで一括 */
  timesliceMs?: number;
  /** 音声チャンクを受け取るコールバック */
  onData?: (blob: Blob, index: number) => void;
};

/**
 * 録音だけ行うフック
 * @param options
 * @returns
 */
export function useAudioRecorder(options?: Options) {
  const { timesliceMs, onData } = options || {};

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef(0);
  const chunksRef = useRef<BlobPart[]>([]);

  const start = useCallback(async () => {
    if (status === "recording") return;

    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStream(s);

    const mr = new MediaRecorder(s, { mimeType: "audio/webm" });

    chunkIndexRef.current = 0;
    chunksRef.current = [];

    mr.ondataavailable = (event) => {
      if (event.data.size <= 0) return;

      if (typeof timesliceMs === "number" && onData) {
        // 10秒ごとなど → その都度コールバックに渡す
        const idx = chunkIndexRef.current++;
        onData(event.data, idx);
      } else {
        // 一括モード → とりあえず溜める
        chunksRef.current.push(event.data);
      }
    };

    mr.onstop = () => {
      // マイク解放
      s.getTracks().forEach((t) => t.stop());
      setStream(null);
      setStatus("idle");
    };

    if (typeof timesliceMs === "number") {
      mr.start(timesliceMs);
    } else {
      mr.start(); // 一括録音モード
    }

    mediaRecorderRef.current = mr;
    setStatus("recording");
  }, [onData, status, timesliceMs]);

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    mr.stop();
    mediaRecorderRef.current = null;
  }, []);

  /** 一括録音モードのとき最終的な Blob をまとめて返すヘルパー */
  const collectFullBlob = useCallback(() => {
    if (chunksRef.current.length === 0) return null;
    return new Blob(chunksRef.current, { type: "audio/webm" });
  }, []);

  return {
    status,
    stream,
    start,
    stop,
    collectFullBlob,
  };
}
