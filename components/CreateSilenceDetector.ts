export function createSilenceDetector(
  stream: MediaStream,
  {
    threshold = 0.01, // 無音とみなす音量（RMS）
    minSilentMs = 800, // 何ミリ秒以上続いたら「無音区間」とするか
    onSilenceChange, // (isSilent: boolean) => void
  }: {
    threshold?: number;
    minSilentMs?: number;
    onSilenceChange?: (isSilent: boolean) => void;
  }
) {
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  source.connect(analyser);

  const data = new Float32Array(analyser.fftSize);
  let lastSilentChange = performance.now();
  let nowSilent = false;

  function check() {
    analyser.getFloatTimeDomainData(data);

    // RMSを計算
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);

    const isBelow = rms < threshold;
    const t = performance.now();

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

    requestAnimationFrame(check);
  }

  requestAnimationFrame(check);

  return () => {
    // 解除用
    source.disconnect();
    analyser.disconnect();
    audioCtx.close();
  };
}
