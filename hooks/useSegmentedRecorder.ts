// src/hooks/useSegmentedRecorder.ts
"use client";

import { AudioSource } from "@/contents/types";
import { createSilenceDetector } from "@/lib/audio/createSilenceDetector";
import { attachGainToStream, closeAudioContext } from "@/lib/audio/gain";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSegmentedRecorderOptions {
  source: AudioSource;
  segmentMs?: number; // デフォルト 10秒
  mimeType?: string; // デフォルト "audio/webm"
  onSegment?: (blob: Blob, index: number) => void | Promise<void>;
  gain?: number;
}

export interface UseSegmentedRecorderReturn {
  isRecording: boolean;
  isSilent: boolean;
  start: () => Promise<void>;
  stop: () => void;
  stream: MediaStream | null;
  audioCtx: AudioContext | null;
}

/**
 * 10秒ごとなど、一定時間ごとに
 * 完結した audio/webm を作って onSegment に渡す録音フック
 */
export function useSegmentedRecorder(
  options: UseSegmentedRecorderOptions
): UseSegmentedRecorderReturn {
  const {
    source,
    segmentMs = 10_000,
    mimeType = "audio/webm",
    onSegment,
    gain = 2.0,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const silenceCleanupRef = useRef<(() => void) | null>(null);
  const [isSilent, setIsSilent] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segmentIndexRef = useRef(0);
  const isRecordingRef = useRef(false);

  // AudioContext / GainNode を保持して stop 時に片付ける
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * ストリームの取得
   * - system: getDisplayMedia → audioTrack だけ抜き出して audio-only Stream にする
   * - mic: getUserMedia audio
   */
  const setupStream = useCallback(async (): Promise<MediaStream> => {
    let rawStream: MediaStream;

    if (source === "system") {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      });

      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach((t) => t.stop());
        throw new Error("No audio track in displayMedia stream");
      }

      // 映像トラックは不要なので止めてしまう
      displayStream.getVideoTracks().forEach((t) => t.stop());

      rawStream = new MediaStream(audioTracks);
    } else {
      rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    }

    // audioContextの作成
    const audioCtx = new AudioContext();
    audioContextRef.current = audioCtx;

    // ゲインを上げる
    const { stream: processed, gainNode } = await attachGainToStream(
      rawStream,
      gain,
      audioCtx
    );

    // 無音検知
    silenceCleanupRef.current = createSilenceDetector(
      {
        type: "node",
        node: gainNode,
      },
      {
        audioCtx,
        onSilenceChange: (silent) => {
          setIsSilent(silent);
          console.log("[SilenceDetector]", { silent });
        },
      }
    );

    // ストリームの保存
    streamRef.current = processed;
    setStream(processed);
    return processed;
  }, [source, gain]);

  /**
   * 1セグメント分の録音を開始
   * 終了時に onSegment を呼び出し、isRecording が true なら次のセグメントを開始
   */
  const startSegment = useCallback(() => {
    const s = streamRef.current;
    if (!s) {
      console.warn("[useSegmentedRecorder] stream is null in startSegment");
      return;
    }

    // 以前の recorder/timer を安全にクリア
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const recorder = new MediaRecorder(s, { mimeType });
    recorderRef.current = recorder;

    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = async () => {
      if (chunks.length === 0) {
        // 無音などで何も録れていない場合
        if (isRecordingRef.current) {
          // 次セグメントへは進める（環境によって ondataavailable が遅れるケース対策）
          startSegment();
        }
        return;
      }

      const blob = new Blob(chunks, { type: mimeType });
      const index = segmentIndexRef.current++;

      console.log(
        "[useSegmentedRecorder] segment stop",
        "index=",
        index,
        "size=",
        blob.size,
        "type=",
        blob.type
      );

      try {
        if (onSegment) {
          await onSegment(blob, index);
        }
      } catch (e) {
        console.error("[useSegmentedRecorder] onSegment error", e);
      }

      if (isRecordingRef.current) {
        // 次の 1 セグメントを録音
        startSegment();
      }
    };

    // 録音開始
    recorder.start();

    // segmentMs 経過したら stop → onstop で次へ
    timerRef.current = setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, segmentMs);
  }, [mimeType, onSegment, segmentMs]);

  const start = useCallback(async () => {
    if (isRecordingRef.current) {
      console.warn("[useSegmentedRecorder] already recording");
      return;
    }
    if (typeof window === "undefined") {
      console.warn("[useSegmentedRecorder] window is undefined (SSR)");
      return;
    }

    try {
      const s = await setupStream();
      console.log(
        "[useSegmentedRecorder] stream tracks",
        s.getTracks().map((t) => `${t.kind}:${t.readyState}`)
      );

      isRecordingRef.current = true;
      setIsRecording(true);
      segmentIndexRef.current = 0;

      startSegment();
    } catch (e) {
      console.error("[useSegmentedRecorder] start error", e);
      isRecordingRef.current = false;
      setIsRecording(false);
      // 必要ならここでエラーコールバックを生やしてもOK
    }
  }, [setupStream, startSegment]);

  const stop = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);

    // segment 用 recorder 停止
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recorderRef.current = null;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // ストリームのトラック停止
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);

    // 無音検知の停止
    if (silenceCleanupRef.current) {
      silenceCleanupRef.current();
      silenceCleanupRef.current = null;
    }

    // audio 後始末
    if (audioContextRef.current) {
      closeAudioContext(audioContextRef.current);
      audioContextRef.current = null;
    }
  }, []);

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isRecording,
    isSilent,
    start,
    stop,
    stream,
    audioCtx: audioContextRef.current,
  };
}
