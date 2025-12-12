// src/components/SummarizeButton.tsx
"use client";

import { useState } from "react";
import { Button } from "./ui/button";

type TranscriptSegment = {
  index: number;
  text: string;
};

type SummaryResponse = {
  summary: string;
};

export function SummarizeButton(props: { segments: TranscriptSegment[] }) {
  const { segments } = props;
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClick = async () => {
    if (!segments.length) {
      setErrorMsg("まだ書き起こしがありません。");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments,
          title: "リアルタイム議事録",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[Summarize] api error", err);
        setErrorMsg("要約に失敗しました。");
        return;
      }

      const data = (await res.json()) as SummaryResponse;
      setSummary(data.summary ?? "");
    } catch (e) {
      console.error("[Summarize] fetch error", e);
      setErrorMsg("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading || segments.length === 0}
        variant="outline"
      >
        {loading ? "要約中..." : "ここまでを要約する"}
      </Button>

      {errorMsg && <p style={{ color: "red", marginTop: 8 }}>{errorMsg}</p>}

      {summary && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            border: "1px solid #ccc",
            borderRadius: 4,
            whiteSpace: "pre-wrap",
            fontSize: 14,
          }}
        >
          {summary}
        </div>
      )}
    </div>
  );
}
