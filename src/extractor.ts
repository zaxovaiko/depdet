import type { ReplacementSource } from "./types.ts";

export type ExtractResult = {
  replacement: string | null;
  source: ReplacementSource;
};

type Pattern = {
  re: RegExp;
  source: Exclude<ReplacementSource, null>;
};

const PATTERNS: readonly Pattern[] = [
  { re: /\{@link\s+([^\s|}]+)(?:\s*\|[^}]*)?\}/, source: "link" },
  { re: /\{@linkcode\s+([^\s|}]+)(?:\s*\|[^}]*)?\}/, source: "link" },
  { re: /\{@linkplain\s+([^\s|}]+)(?:\s*\|[^}]*)?\}/, source: "link" },
  { re: /use\s+`([^`]+)`/i, source: "heuristic" },
  { re: /replaced?\s+(?:by|with)\s+`([^`]+)`/i, source: "heuristic" },
  { re: /prefer\s+`([^`]+)`/i, source: "heuristic" },
  { re: /instead,?\s+use\s+`([^`]+)`/i, source: "heuristic" },
  {
    re: /use\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\(\))?)\s+instead/i,
    source: "heuristic",
  },
  {
    re: /replaced?\s+(?:by|with)\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\(\))?)/i,
    source: "heuristic",
  },
  {
    re: /prefer\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\(\))?)/i,
    source: "heuristic",
  },
];

const normalize = (text: string): string =>
  text
    .replace(/^\s*\*\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();

type Hit = { replacement: string; source: Exclude<ReplacementSource, null> };

const tryPattern = (text: string, { re, source }: Pattern): Hit | null => {
  const match = text.match(re);
  return match?.[1] ? { replacement: match[1].trim(), source } : null;
};

export const extract = (rawText: string): ExtractResult => {
  const text = normalize(rawText);
  if (!text) return { replacement: null, source: null };

  const hit = PATTERNS.map((p) => tryPattern(text, p)).find((r): r is Hit => r !== null);

  return hit ?? { replacement: null, source: null };
};
