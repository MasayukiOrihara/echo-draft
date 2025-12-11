import { useState } from "react";
import { Button } from "./ui/button";

type SpeakerSegment = {
  speaker: string;
  text: string;
};

export function SpeakerLabelButton(props: { lines: string[] }) {
  const { lines } = props;
  const [segments, setSegments] = useState<SpeakerSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClick = async () => {
    if (!lines.length) {
      setErrorMsg("まだテキストがありません。");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/speaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines,
          title: "リアルタイム議事録",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[SpeakerLabel] api error", err);
        setErrorMsg("話者推定に失敗しました。");
        return;
      }

      const data = (await res.json()) as { segments: SpeakerSegment[] };
      setSegments(data.segments ?? []);
    } catch (e) {
      console.error("[SpeakerLabel] fetch error", e);
      setErrorMsg("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading || lines.length === 0}
        variant="outline"
        className=""
      >
        {loading ? "話者推定中..." : "話者ラベルを付ける"}
      </Button>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {segments.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <h3>話者付きログ</h3>
          <ul>
            {segments.map((s, i) => (
              <li key={i}>
                <strong>{s.speaker}:</strong> {s.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
