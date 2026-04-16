import type { Format, Report } from '../types.ts'
import { renderJson } from './json.ts'
import { renderMarkdown } from './markdown.ts'
import { renderPretty } from './pretty.ts'

export const REPORTERS: Readonly<Record<Format, (r: Report, cwd?: string) => string>> = {
  pretty: renderPretty,
  json: renderJson,
  md: renderMarkdown,
}

export { renderJson, renderMarkdown, renderPretty }
