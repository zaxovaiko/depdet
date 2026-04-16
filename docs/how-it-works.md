# How It Works

depdet runs two passes over a TypeScript Program built via [ts-morph](https://ts-morph.com).

## Pass 1: Collect deprecated declarations

Walks every declaration in scope — `function`, `method`, `class`, `property`, `variable`, `type`, `interface`, `enum`, and accessor — and checks for a `@deprecated` JSDoc tag.

This includes:
- Your own source files
- Type definitions in `node_modules` (`.d.ts` files) — unless `--no-deps` is set

## Pass 2: Match identifiers in your source

Every identifier in your source files is checked against the TypeScript type checker to see if it resolves to a deprecated declaration.

The checker follows:
- Re-exports (`export { foo } from './bar'`)
- Method chains (`z.string().email()` resolves through each call)
- Property access (`obj.deprecatedProp`)

## Replacement extraction

For each deprecated declaration, depdet tries to extract the replacement hint in this order:

| Strategy | Example JSDoc |
|----------|--------------|
| `{@link X}` | `@deprecated Use {@link newFn} instead` |
| `{@linkcode X}` | `@deprecated {@linkcode newFn}` |
| `{@linkplain X}` | `@deprecated {@linkplain newFn}` |
| Free-text: use | `@deprecated Use newFn instead` |
| Free-text: replaced by | `@deprecated Replaced by newFn` |
| Free-text: prefer | `@deprecated Prefer newFn` |
| Bareword variants | `@deprecated newFn` |

If no hint is found, `replacement` is `null`.

## Non-goals

- **Auto-fix** - writing replacements back to files (planned for `--fix`)
- **`.vue` / `.svelte` / `.astro`** - only `.ts`, `.tsx`, `.js`, `.jsx`, `.d.ts`
- **Runtime detection** - only static analysis via JSDoc, not runtime `console.warn` deprecations
