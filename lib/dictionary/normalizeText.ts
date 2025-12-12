import { DICTIONARY } from "@/contents/disctionary/properNouns.disctionary";

export const normalizeText = (text: string) =>
  DICTIONARY.reduce(
    (acc, rule) => acc.replace(rule.pattern, rule.replace),
    text
  );
