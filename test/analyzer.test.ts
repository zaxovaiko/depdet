import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { findOccurrences } from '../src/analyzer.ts'
import { loadProject } from '../src/project.ts'
import { collectDeprecations } from '../src/scanner.ts'

const fixture = resolve(import.meta.dirname, 'fixtures/custom-deprecated')

describe('findOccurrences (custom-deprecated fixture)', () => {
  const project = loadProject({ cwd: fixture })
  const deprecations = collectDeprecations(project, true)
  const occurrences = findOccurrences(project, deprecations)
  const byName = occurrences.map((o) => o.deprecation.qualifiedName)

  test('finds usage of each deprecated symbol', () => {
    expect(byName).toContain('oldFn')
    expect(byName).toContain('stale')
    expect(byName).toContain('Legacy.oldMethod')
    expect(byName).toContain('uncatalogued')
  })

  test('no occurrences point at app.ts Legacy class usage without method', () => {
    // `new Legacy()` constructs; Legacy itself is not deprecated, only oldMethod.
    // But Legacy import is referenced; that's fine - class is not deprecated, so no occurrence for it.
    const legacyOccurrences = occurrences.filter((o) => o.deprecation.qualifiedName === 'Legacy')
    expect(legacyOccurrences.length).toBe(0)
  })

  test('occurrences carry file + line + snippet', () => {
    occurrences.forEach((o) => {
      expect(o.file).toMatch(/app\.ts$/)
      expect(o.line).toBeGreaterThan(0)
      expect(o.column).toBeGreaterThan(0)
      expect(o.snippet.length).toBeGreaterThan(0)
    })
  })
})
