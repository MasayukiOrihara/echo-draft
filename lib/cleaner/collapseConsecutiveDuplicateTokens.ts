/**
 * 「セキ… セキ… セキ…」や
 * 「そろそろ、そろそろ、そろそろ、…」みたいな
 * “同じ語が連続しまくる”パターンを maxRepeat 回までに圧縮する。
 */
export function collapseConsecutiveDuplicateTokens(
  text: string,
  maxRepeat = 2
): string {
  // 「単語」と「区切り記号(空白や句読点)」を両方保持したまま分割
  const parts = text.split(/(\s+|[、，。！？…]+)/);

  const result: string[] = [];
  let lastToken = "";
  let count = 0;

  const isSeparator = (s: string) => /\s+|[、，。！？…]+/.test(s);

  for (const part of parts) {
    if (part === "") continue;

    if (isSeparator(part)) {
      // 区切り記号はそのまま通す（カウントもリセットしない）
      result.push(part);
      continue;
    }

    // ここに来るのは「単語側」
    if (part === lastToken) {
      count += 1;
      if (count <= maxRepeat) {
        result.push(part);
      } else {
        // maxRepeat を超えた分は捨てる
        continue;
      }
    } else {
      lastToken = part;
      count = 1;
      result.push(part);
    }
  }

  return result.join("");
}
