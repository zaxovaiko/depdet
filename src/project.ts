import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Project, type ProjectOptions, type SourceFile } from "ts-morph";

const walkUp = (start: string): readonly string[] => {
	const steps: string[] = [];
	let dir = start;
	while (true) {
		steps.push(dir);
		const parent = dirname(dir);
		if (parent === dir) return steps;
		dir = parent;
	}
};

const findTsConfig = (cwd: string): string | undefined =>
	walkUp(cwd)
		.map((dir) => join(dir, "tsconfig.json"))
		.find((p) => existsSync(p) && statSync(p).isFile());

const syntheticOptions = (_cwd: string): ProjectOptions => ({
	compilerOptions: {
		allowJs: true,
		checkJs: false,
		target: 99,
		module: 99,
		moduleResolution: 100,
		esModuleInterop: true,
		skipLibCheck: true,
		strict: false,
	},
	skipAddingFilesFromTsConfig: true,
	useInMemoryFileSystem: false,
	tsConfigFilePath: undefined,
});

const DEFAULT_GLOBS = [
	"src/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
	"lib/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
	"app/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
	"packages/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
	"*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
];

export type LoadProjectOptions = {
	cwd: string;
	tsConfigPath?: string;
	include?: readonly string[];
	exclude?: readonly string[];
};

export const loadProject = (opts: LoadProjectOptions): Project => {
	const cwd = resolve(opts.cwd);
	const tsConfigFilePath = opts.tsConfigPath
		? resolve(cwd, opts.tsConfigPath)
		: findTsConfig(cwd);

	const project = tsConfigFilePath
		? new Project({ tsConfigFilePath, skipAddingFilesFromTsConfig: false })
		: new Project(syntheticOptions(cwd));

	if (!tsConfigFilePath) {
		const extraIncludes =
			opts.include && opts.include.length > 0 ? opts.include : DEFAULT_GLOBS;
		const patterns = extraIncludes.map((g) => join(cwd, g));
		const excludes = (opts.exclude ?? ["**/node_modules/**", "**/dist/**"]).map(
			(g) => `!${join(cwd, g)}`,
		);
		project.addSourceFilesAtPaths([...patterns, ...excludes]);
	}

	// Access the TS Program so all dep .d.ts files (node_modules/**/*.d.ts)
	// reachable via imports are loaded by the TypeScript language service.
	// Then mirror them into the ts-morph Project so scanners can walk them.
	// Force TS Program creation so all dep files (node_modules/**/*.d.ts) are
	// resolved and available via the type checker.
	project.getProgram().compilerObject.getSourceFiles();
	return project;
};

export const allSourceFiles = (project: Project): readonly SourceFile[] => {
	const program = project.getProgram().compilerObject;
	return program
		.getSourceFiles()
		.map((sf) => project.getSourceFile(sf.fileName))
		.filter((sf): sf is SourceFile => sf !== undefined);
};
