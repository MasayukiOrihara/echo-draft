"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading">("idle");

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const onUpload = async () => {
    if (!file) {
      alert("音声ファイルを選択してください");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    setStatus("uploading");
    setText("");

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      console.log("[test-upload] status:", res.status);

      const json = await res.json();
      if (!res.ok) {
        console.error("[test-upload] error:", json);
        alert("エラー: " + (json.error ?? "unknown"));
        return;
      }

      setText(json.text ?? "");
    } catch (e) {
      console.error("[test-upload] fetch error", e);
      alert("通信エラー");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">🎧 音声ファイルで文字起こしテスト</h1>

      <div className="space-y-2">
        <input
          type="file"
          accept="audio/*"
          onChange={onFileChange}
          className="block"
        />
        <Button onClick={onUpload} disabled={!file || status === "uploading"}>
          {status === "uploading" ? "送信中..." : "この音声でテスト"}
        </Button>
      </div>

      <div>
        <h2 className="mb-1 font-semibold">📝 結果</h2>
        <textarea
          className="h-64 w-full rounded-md border bg-background p-3 text-sm"
          readOnly
          value={text}
        />
      </div>
    </div>
  );
}
