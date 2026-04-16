export type DeclKind =
  | 'function'
  | 'method'
  | 'class'
  | 'property'
  | 'variable'
  | 'type'
  | 'interface'
  | 'enum'
  | 'accessor'

export type ReplacementSource = 'link' | 'heuristic' | null

export type Deprecation = {
  symbolId: string
  name: string
  qualifiedName: string
  kind: DeclKind
  declFile: string
  declLine: number
  deprecationText: string
  replacement: string | null
  replacementSource: ReplacementSource
}

export type Occurrence = {
  deprecation: Deprecation
  file: string
  line: number
  column: number
  snippet: string
}

export type Report = {
  deprecations: readonly Deprecation[]
  occurrences: readonly Occurrence[]
  scanned: {
    sourceFiles: number
    depFiles: number
    durationMs: number
  }
}

export type Format = 'pretty' | 'json' | 'md'

export type ScanOptions = {
  cwd?: string
  paths?: readonly string[]
  project?: string
  include?: readonly string[]
  exclude?: readonly string[]
  noDeps?: boolean
}
