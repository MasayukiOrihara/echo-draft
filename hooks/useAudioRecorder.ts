// hooks/useAudioRecorder.ts
"use client";

import { useCallback, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording";
export type InputSource = "mic" | "system";

type Options = {
  source?: InputSource;
  /** timeslice ミリ秒（例: 10秒ごとなら 10000） undefined なら stop まで一括 */
  timesliceMs?: number;
  /** 何秒分送りたいか */
  windowMs?: number;
  /** 音声チャンクを受け取るコールバック */
  onData?: (blob: Blob, index: number) => void;
};

/**
 * 録音だけ行うフック
 * @param options
 * @returns
 */
export function useAudioRecorder(options?: Options) {
  const { source = "mic", timesliceMs, onData } = options ?? {};

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef(0);
  const chunksRef = useRef<BlobPart[]>([]);

  const start = useCallback(async () => {
    if (status === "recording") return;

    let s: MediaStream;
    if (source === "system") {
      // 🖥 画面/タブ + 音声（元ストリーム）
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      });

      // audio トラックだけ取り出す
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error("No audio track in displayMedia stream");
      }

      // 🎧 音声だけの新しい MediaStream を作る
      const audioOnlyStream = new MediaStream(audioTracks);

      // 映像はもう不要なら止めておく
      displayStream.getVideoTracks().forEach((t) => t.stop());

      s = audioOnlyStream;
    } else {
      // 🎙 通常マイク
      s = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    }
    setStream(s);

    const mr = new MediaRecorder(s, { mimeType: "audio/webm" });

    chunkIndexRef.current = 0;
    chunksRef.current = [];

    const maxChunks =
      typeof timesliceMs === "number" && options?.windowMs
        ? Math.ceil(options.windowMs / timesliceMs) // 例: 30sec / 10sec = 3
        : null;

    mr.ondataavailable = (event) => {
      if (event.data.size <= 0) return;

      // まず常に push
      chunksRef.current.push(event.data);

      // 🔁 リングバッファ：古いチャンクを捨てて「直近 maxChunks 個だけ」にする
      if (maxChunks && chunksRef.current.length > maxChunks) {
        const overflow = chunksRef.current.length - maxChunks;
        chunksRef.current.splice(0, overflow); // 先頭から overflow 個削る
      }

      if (typeof timesliceMs === "number" && onData) {
        // 直近 N 秒ぶんだけをつなげた「1本の WebM」
        const fullBlob = new Blob(chunksRef.current, {
          type: event.data.type || "audio/webm;codecs=opus",
        });

        const idx = chunkIndexRef.current++;
        onData(fullBlob, idx); // ← ここで /api/transcribe に投げる側を呼ぶ
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
