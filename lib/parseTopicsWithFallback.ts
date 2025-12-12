export function parseTopicsWithFallback(raw: string): string[] {
  // ``` や ```json が付いてきた場合に剥がす（元コード踏襲）
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x).trim()).filter(Boolean);
    }
  } catch (e) {
    // ignore -> fallback
  }

  // 最悪、改行区切りでバラすフォールバック（元コード踏襲）
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-・\s]+/, "").trim())
    .filter((l) => l.length > 0);
}
