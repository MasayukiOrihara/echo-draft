import { DictionaryRule } from "../types/dictionary.type";

// 固有名詞辞書
export const DICTIONARY: DictionaryRule[] = [
  { pattern: /こーどますたー|コードマスター/gi, replace: "CodeMaster" },
  { pattern: /ふくしりんく|フクシリンク/gi, replace: "福祉リンク" },
  { pattern: /ぷりずま/gi, replace: "Prisma" },
];
