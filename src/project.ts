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
  const tsConfigFilePath = opts.tsConfigPath ? resolve(cwd, opts.tsConfigPath) : findTsConfig(cwd);

  const project = tsConfigFilePath
    ? new Project({ tsConfigFilePath, skipAddingFilesFromTsConfig: false })
    : new Project(syntheticOptions(cwd));

  if (!tsConfigFilePath) {
    const extraIncludes = opts.include && opts.include.length > 0 ? opts.include : DEFAULT_GLOBS;
    const patterns = extraIncludes.map((g) => join(cwd, g));
    const excludes = (opts.exclude ?? ["**/node_modules/**", "**/dist/**"]).map(
      (g) => `!${join(cwd, g)}`,
    );
    project.addSourceFilesAtPaths([...patterns, ...excludes]);
  }

  return project;
};

// Returns only explicitly added source files (user source). Dep .d.ts files are
// resolved lazily by the TypeScript type checker on demand — never loaded in bulk.
export const allSourceFiles = (project: Project): readonly SourceFile[] => project.getSourceFiles();

// Count dep files from the TS program without loading them into ts-morph's cache.
export const countDepFiles = (project: Project): number =>
  project
    .getProgram()
    .compilerObject.getSourceFiles()
    .filter((sf) => sf.fileName.includes("/node_modules/")).length;
