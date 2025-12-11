/**
 * 連続文字の正規化
 * @param text
 * @param maxRepeat
 * @returns
 */
export function collapseConsecutiveDuplicateSentences(
  text: string,
  maxRepeat = 2
): string {
  // ざっくり「。」「？」「！」や改行で文区切り
  const rawSentences = text
    .split(/(?<=[。！？\?])\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const result: string[] = [];
  let last = "";
  let count = 0;

  for (const s of rawSentences) {
    if (s === last) {
      count += 1;
      if (count <= maxRepeat) {
        result.push(s);
      } else {
        // maxRepeatを超えた分は捨てる
        continue;
      }
    } else {
      last = s;
      count = 1;
      result.push(s);
    }
  }

  // 日本語なので文末に "。" 付いてないケースもあるから適当に連結
  return result.join("。").replace(/。。+/g, "。");
}
