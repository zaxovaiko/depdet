import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { scan } from '../src/index.ts'

const fixture = resolve(import.meta.dirname, 'fixtures/zod-project')

describe('scan against zod-project fixture', () => {
  test('reports occurrences for z.string().email() and .url()', async () => {
    const report = await scan({ cwd: fixture })

    const emailOccurrences = report.occurrences.filter((o) => o.deprecation.name === 'email')
    const urlOccurrences = report.occurrences.filter((o) => o.deprecation.name === 'url')

    expect(emailOccurrences.length).toBeGreaterThan(0)
    expect(urlOccurrences.length).toBeGreaterThan(0)

    // Replacement should be populated for both.
    expect(emailOccurrences[0]?.deprecation.replacement).not.toBeNull()
    expect(urlOccurrences[0]?.deprecation.replacement).not.toBeNull()

    // Decl must come from node_modules (zod), not from user source.
    expect(emailOccurrences[0]?.deprecation.declFile).toContain('/node_modules/')
  }, 60_000)
})
