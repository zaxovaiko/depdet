import { relative } from "node:path";
import type { Report } from "../types.ts";

const rel = (p: string, cwd: string): string => {
	const r = relative(cwd, p);
	return r.startsWith("..") ? p : r;
};

const escapeMarkdown = (s: string): string => s.replace(/\|/g, "\\|");

export const renderMarkdown = (report: Report, cwd = process.cwd()): string => {
	if (report.occurrences.length === 0) {
		return "## Deprecations\n\n_No `@deprecated` usages found._\n";
	}

	const header =
		"## Deprecations\n\n| Location | Deprecated | → | Replacement |\n|---|---|---|---|";
	const rows = report.occurrences.map((o) => {
		const location = `\`${rel(o.file, cwd)}:${o.line}:${o.column}\``;
		const deprecated = `\`${escapeMarkdown(o.deprecation.qualifiedName)}\``;
		const replacement = o.deprecation.replacement
			? `\`${escapeMarkdown(o.deprecation.replacement)}\``
			: "_(no hint)_";
		return `| ${location} | ${deprecated} | → | ${replacement} |`;
	});

	const summary = `\n\n_${report.occurrences.length} occurrence(s). Scanned ${report.scanned.sourceFiles} source + ${report.scanned.depFiles} dep files in ${report.scanned.durationMs}ms._\n`;
	return `${header}\n${rows.join("\n")}${summary}`;
};
