// 任意のコンポーネント
import { useState } from "react";
import { Button } from "../ui/button";
import { SegmentText, TopicResponse } from "@/contents/types/action.type";

export function TopicPreviewButton(props: { segments: SegmentText[] }) {
  const { segments } = props;
  const [topics, setTopics] = useState<string[]>([]);
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
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments,
          title: "リアルタイム議事録",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[TopicPreview] api error", err);
        setErrorMsg("トピック抽出に失敗しました。");
        return;
      }

      const data = (await res.json()) as TopicResponse;
      setTopics(data.topics ?? []);
    } catch (e) {
      console.error("[TopicPreview] fetch error", e);
      setErrorMsg("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="topic-preview">
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading || segments.length === 0}
        variant="outline"
      >
        {loading ? "抽出中..." : "ここまでのトピックを表示"}
      </Button>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {topics.length > 0 && (
        <div style={{ marginTop: "8px" }}>
          <h3>これまでのトピック</h3>
          <ul>
            {topics.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
