/** Gain to Stream の返却型 */
export type GainAttachedStream = {
  stream: MediaStream;
  sourceNode: MediaStreamAudioSourceNode;
  gainNode: GainNode;
  destNode: MediaStreamAudioDestinationNode;
};

/**
 * 生の MediaStream に GainNode を噛ませて
 * 音量アップした Stream を返す
 * @param input 生の MediaStream
 * @param gainValue 音量
 * @param audioCtx メイン音声処理エンジン（DSPエンジン）
 * @returns
 */
export function attachGainToStream(
  input: MediaStream,
  gainValue: number,
  audioCtx: AudioContext
): GainAttachedStream {
  // 入力（MediaStream）を AudioContext に取り込む
  const sourceNode = audioCtx.createMediaStreamSource(input);

  // 音量調整用の GainNode
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = gainValue;

  // 出力を MediaStream として取り出すための Destination
  const destNode = audioCtx.createMediaStreamDestination();

  // source -> gain -> destination の経路を構築
  sourceNode.connect(gainNode);
  gainNode.connect(destNode);

  // ノードを返す
  return {
    stream: destNode.stream,
    sourceNode,
    gainNode,
    destNode,
  };
}

/**
 * AudioContext の後始末する
 * @param ctx 作成した AudioContext
 * @returns
 */
export function closeAudioContext(ctx: AudioContext | null) {
  if (!ctx) return;
  ctx.close().catch(() => {});
}
