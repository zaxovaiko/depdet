import { relative } from "node:path";
import Table from "cli-table3";
import pc from "picocolors";
import type { Report } from "../types.ts";

const rel = (p: string, cwd: string): string => {
	const r = relative(cwd, p);
	return r.startsWith("..") ? p : r;
};

export const renderPretty = (report: Report, cwd = process.cwd()): string => {
	if (report.occurrences.length === 0) {
		return `${pc.green("✓")} No @deprecated usages found. ${pc.dim(
			`(${report.deprecations.length} deprecated symbols known, scanned ${report.scanned.sourceFiles} source + ${report.scanned.depFiles} dep files in ${report.scanned.durationMs}ms)`,
		)}`;
	}

	const table = new Table({
		head: [
			pc.bold("Location"),
			pc.bold("Deprecated"),
			pc.bold("→"),
			pc.bold("Replacement"),
		],
		style: { head: [], border: [] },
		wordWrap: true,
	});

	report.occurrences.forEach((o) => {
		const location = `${rel(o.file, cwd)}:${o.line}:${o.column}`;
		const deprecated = pc.yellow(o.deprecation.qualifiedName);
		const arrow = pc.dim("→");
		const replacement = o.deprecation.replacement
			? pc.green(o.deprecation.replacement)
			: pc.dim("(no hint)");
		table.push([location, deprecated, arrow, replacement]);
	});

	const summary = pc.dim(
		`\n${report.occurrences.length} occurrence(s) of ${report.deprecations.filter((d) => report.occurrences.some((o) => o.deprecation.symbolId === d.symbolId)).length} deprecated symbol(s). Scanned ${report.scanned.sourceFiles} source + ${report.scanned.depFiles} dep files in ${report.scanned.durationMs}ms.`,
	);

	return `${table.toString()}${summary}`;
};
