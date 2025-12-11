/** stream と node の判別可能ユニオン */
type SilenceDetectorTarget =
  | { type: "stream"; stream: MediaStream }
  | { type: "node"; node: AudioNode };

/** オプション型 */
type SilenceDetectorOptions = {
  threshold?: number; // 無音とみなす音量（RMS）
  minSilentMs?: number; // 何ミリ秒以上続いたら「無音区間」とするか
  onSilenceChange?: (isSilent: boolean) => void; // (isSilent: boolean) => void
  audioCtx: AudioContext; // メイン音声処理エンジン（DSPエンジン）
};

/**
 * 渡された音声ストリームが“一定時間以上静かかどうか”をリアルタイムで監視する仕組み
 * @param stream 音声ストリーム
 * @param param1 初期設定
 * @returns
 */
export function createSilenceDetector(
  target: SilenceDetectorTarget,
  {
    threshold = 0.03,
    minSilentMs = 800,
    onSilenceChange,
    audioCtx,
  }: SilenceDetectorOptions
) {
  // stream と node を共通の sourceNode にする
  const createdSourceNode =
    target.type === "stream"
      ? audioCtx.createMediaStreamSource(target.stream)
      : null;
  const sourceNode: AudioNode =
    target.type === "stream" ? createdSourceNode! : target.node;

  // 波形の中身を確認
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  sourceNode.connect(analyser);

  // 状態管理用の変数
  const data = new Float32Array(analyser.fftSize);
  let lastSilentChange = performance.now();
  let nowSilent = false;

  let stopped = false;
  let rafId: number | null = null;

  function check() {
    if (stopped) return;

    analyser.getFloatTimeDomainData(data);

    // RMSを計算
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);

    const isBelow = rms < threshold;
    const t = performance.now();

    // 無音判定ロジック
    if (isBelow) {
      // 一定時間以上「小さい」状態が続いたら無音
      if (!nowSilent && t - lastSilentChange >= minSilentMs) {
        nowSilent = true;
        onSilenceChange?.(true);
      }
    } else {
      // 音が一定以上になったら、有音に戻す
      if (nowSilent) {
        nowSilent = false;
        onSilenceChange?.(false);
      }
      lastSilentChange = t;
    }
    rafId = requestAnimationFrame(check);
  }
  rafId = requestAnimationFrame(check);

  return () => {
    stopped = true;
    if (rafId != null) {
      cancelAnimationFrame(rafId);
    }
    // 解除用
    sourceNode.disconnect(analyser);
    analyser.disconnect();

    if (createdSourceNode) {
      createdSourceNode.disconnect();
    }
  };
}
