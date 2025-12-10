"use client";

import { useEffect, useRef } from "react";

type AudioWaveformProps = {
  stream: MediaStream | null;
  /** true のときだけ描画＆AudioContextを動かす */
  active?: boolean;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * 音声波形表示
 * @param param0
 * @returns
 */
export function AudioWaveform({
  stream,
  active = true,
  width = 600,
  height = 120,
  className,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !active) {
      // 停止・クリーンアップ
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    // AudioContext & Analyser セットアップ
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 2048;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      const { width: w, height: h } = canvas;
      canvasCtx.clearRect(0, 0, w, h);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "#22c55e"; // stroke色。必要なら props に出してもOK

      canvasCtx.beginPath();

      const sliceWidth = (w * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // 0〜255 → 0〜2
        const y = (v * h) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(w, h / 2);
      canvasCtx.stroke();
    };

    draw();

    // アンマウント or stream/active 変更時クリーンアップ
    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [stream, active]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}
