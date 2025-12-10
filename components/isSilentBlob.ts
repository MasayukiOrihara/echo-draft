export async function isSilentBlob(
  blob: Blob,
  {
    threshold = 0.01, // RMSのしきい値
  }: { threshold?: number } = {}
): Promise<boolean> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  let sum = 0;
  let count = 0;

  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
      count++;
    }
  }

  const rms = Math.sqrt(sum / count);
  audioCtx.close();

  return rms < threshold;
}
