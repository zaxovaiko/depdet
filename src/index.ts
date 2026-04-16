import type { SourceFile } from 'ts-morph'
import { findOccurrences } from './analyzer.ts'
import { allSourceFiles, loadProject } from './project.ts'
import { collectDeprecations } from './scanner.ts'
import type { Report, ScanOptions } from './types.ts'

const countFiles = (files: readonly SourceFile[]) => {
  const source = files.filter((sf) => !sf.getFilePath().includes('/node_modules/')).length
  return { source, deps: files.length - source }
}

export const scan = async (opts: ScanOptions = {}): Promise<Report> => {
  const cwd = opts.cwd ?? process.cwd()
  const started = Date.now()

  const project = loadProject({
    cwd,
    tsConfigPath: opts.project,
    include: opts.include,
    exclude: opts.exclude,
  })

  const deprecations = collectDeprecations(project, opts.noDeps ?? false)
  const occurrences = findOccurrences(project, deprecations)
  const { source, deps } = countFiles(allSourceFiles(project))

  return {
    deprecations,
    occurrences,
    scanned: {
      sourceFiles: source,
      depFiles: deps,
      durationMs: Date.now() - started,
    },
  }
}

export type { Deprecation, Format, Occurrence, Report, ScanOptions } from './types.ts'
export { REPORTERS, renderJson, renderMarkdown, renderPretty } from './reporters/index.ts'
