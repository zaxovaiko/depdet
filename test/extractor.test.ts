import { describe, expect, test } from 'bun:test'
import { extract } from '../src/extractor.ts'

describe('extract', () => {
  test('empty returns null', () => {
    expect(extract('')).toEqual({ replacement: null, source: null })
    expect(extract('   ')).toEqual({ replacement: null, source: null })
  })

  test('{@link X} extracts link', () => {
    expect(extract('Use {@link newFn} instead.')).toEqual({
      replacement: 'newFn',
      source: 'link',
    })
  })

  test('{@linkcode X} extracts link', () => {
    expect(extract('Use {@linkcode newFn} instead.')).toEqual({
      replacement: 'newFn',
      source: 'link',
    })
  })

  test('Use `X` heuristic', () => {
    expect(extract('Use `z.email()` instead.')).toEqual({
      replacement: 'z.email()',
      source: 'heuristic',
    })
  })

  test('Replaced by `X` heuristic', () => {
    expect(extract('Replaced by `newThing`.')).toEqual({
      replacement: 'newThing',
      source: 'heuristic',
    })
  })

  test('Prefer `X` heuristic', () => {
    expect(extract('Prefer `newThing` for this.')).toEqual({
      replacement: 'newThing',
      source: 'heuristic',
    })
  })

  test('bareword "use X instead"', () => {
    expect(extract('use newFn instead')).toEqual({
      replacement: 'newFn',
      source: 'heuristic',
    })
  })

  test('bareword "replaced by X"', () => {
    expect(extract('This is replaced by newFn.')).toEqual({
      replacement: 'newFn',
      source: 'heuristic',
    })
  })

  test('JSDoc asterisk prefixes stripped', () => {
    const text = `* Use {@link newFn} instead.\n * Some extra note.`
    expect(extract(text)).toEqual({ replacement: 'newFn', source: 'link' })
  })

  test('no hint', () => {
    expect(extract('This is deprecated without reason.')).toEqual({
      replacement: null,
      source: null,
    })
  })

  test('link takes priority over heuristic', () => {
    const text = 'Use {@link newFn} instead, or use `fallback` instead.'
    expect(extract(text)).toEqual({ replacement: 'newFn', source: 'link' })
  })
})
