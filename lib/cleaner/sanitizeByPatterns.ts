import { collapseConsecutiveDuplicateSentences } from "./collapseConsecutiveDuplicateSentences";
import { collapseConsecutiveDuplicateTokens } from "./collapseConsecutiveDuplicateTokens";

/**
 * ハルシネーションによる NG ワードの切り出す
 * @param text
 * @param patterns
 * @returns
 */
export function sanitizeByPatterns(raw: string, patterns: string[]): string {
  let text = raw;

  // 1. 固定NGフレーズ除去
  for (const phrase of patterns) {
    text = text.replace(new RegExp(phrase, "g"), "");
  }

  // 2. 不自然な連続文の圧縮
  text = collapseConsecutiveDuplicateSentences(text, 1);

  // 3. Wordレベルの連続重複除去（セキセキセキ…/そろそろそろそろ…）
  text = collapseConsecutiveDuplicateTokens(text, 2);

  return text.trim();
}
