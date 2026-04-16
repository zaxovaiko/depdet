import { findOccurrences } from "./analyzer.ts";
import { allSourceFiles, countDepFiles, loadProject } from "./project.ts";
import { collectDeprecations } from "./scanner.ts";
import type { Report, ScanOptions } from "./types.ts";

export const scan = async (opts: ScanOptions = {}): Promise<Report> => {
	const cwd = opts.cwd ?? process.cwd();
	const noDeps = opts.noDeps ?? false;
	const started = Date.now();

	const project = loadProject({
		cwd,
		tsConfigPath: opts.project,
		include: opts.include,
		exclude: opts.exclude,
	});

	const occurrences = findOccurrences(project, noDeps);
	const sourceFiles = allSourceFiles(project).length;
	const depFiles = noDeps ? 0 : countDepFiles(project);

	// Collect user-source deprecated declarations for the report catalogue.
	const deprecations = collectDeprecations(project, true);

	return {
		deprecations,
		occurrences,
		scanned: {
			sourceFiles,
			depFiles,
			durationMs: Date.now() - started,
		},
	};
};

export {
	REPORTERS,
	renderJson,
	renderMarkdown,
	renderPretty,
} from "./reporters/index.ts";
export type {
	Deprecation,
	Format,
	Occurrence,
	Report,
	ScanOptions,
} from "./types.ts";
