'use client';

import { Button } from '@/components/ui/button';
import React, { use, useRef, useState } from 'react';
import { AudioWaveform } from './audio/AudioWaveform';

export const RecordAndTranscribe: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(stream); // ← 波形コンポーネントに渡す

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm', // ブラウザが対応してればこれでOK
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // 録音終了 → Blob 作成
        setStream(null);
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        setStatus('uploading');
        try {
          const formData = new FormData();
          formData.append('file', blob, 'meeting.webm');

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error('transcribe failed');

          const json = await res.json();
          setTranscript(json.text ?? '');
        } catch (e) {
          console.error(e);
          alert('文字起こしに失敗しました');
        } finally {
          setStatus('idle');
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setStatus('recording');
    } catch (err) {
      console.error(err);
      alert('マイクへのアクセスに失敗しました');
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    mr.stop();
    // マイクストリーム開放
    mr.stream.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>会議録音 → 文字起こし PoC</h1>

      <div style={{ marginBottom: 12 }}>
        <Button
          variant="default"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={status === 'uploading'}
          className='bg-zinc-600 hover:bg-zinc-800 text-white hover:cursor-pointer'
        >
          {isRecording ? '⏹ 録音停止' : '🔴 録音開始'}
        </Button>
        <span style={{ marginLeft: 8 }}>
          状態: {status === 'idle' && '待機中'}
          {status === 'recording' && '録音中…'}
          {status === 'uploading' && '文字起こし中…'}
        </span>
      </div>

      {/* 波形（完全に独立したコンポーネント） */}
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

      <h2>文字起こし結果</h2>
      <textarea
        style={{ width: '100%', height: 300 }}
        value={transcript}
        readOnly
      />
    </div>
  );
};
