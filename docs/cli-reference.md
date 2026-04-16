# CLI Reference

## Usage

```sh
depdet [paths...] [options]
```

The first positional `path` sets the project root. Defaults to the current working directory.

## Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--format` | `-f` | `pretty \| json \| md` | `pretty` | Output format |
| `--project` | `-p` | `string` | auto-detect | Path to `tsconfig.json` |
| `--include` | | `glob` | — | Extra glob to include (repeatable) |
| `--exclude` | | `glob` | — | Glob to exclude (repeatable) |
| `--no-deps` | | `boolean` | `false` | Skip `node_modules`, scan user source only |
| `--fail-on-found` | | `boolean` | `false` | Exit with code `1` if any occurrence found |
| `--help` | `-h` | | | Show help |
| `--version` | `-v` | | | Show version |

## Output formats

### `--format pretty` (default)

Human-readable table printed to stdout.

```sh
npx depdet
```

```
┌───────────────────┬─────────────────┬───┬─────────────┐
│ Location          │ Deprecated      │ → │ Replacement │
├───────────────────┼─────────────────┼───┼─────────────┤
│ src/schema.ts:3:21│ ZodString.email │ → │ z.email()   │
└───────────────────┴─────────────────┴───┴─────────────┘
```

### `--format json`

Machine-readable JSON — ideal for piping to LLMs or custom scripts.

```sh
npx depdet --format json
```

```json
{
  "occurrences": [
    {
      "file": "src/schema.ts",
      "line": 3,
      "column": 21,
      "deprecation": {
        "qualifiedName": "ZodString.email",
        "replacement": "z.email()"
      }
    }
  ]
}
```

### `--format md`

Markdown table — paste directly into PR descriptions or GitHub comments.

```sh
npx depdet --format md
```

## Examples

```sh
# scan current directory
npx depdet

# scan a specific package in a monorepo
npx depdet packages/core

# only your source, skip node_modules types
npx depdet --no-deps

# fail in CI if any deprecated APIs are used
npx depdet --fail-on-found

# output markdown for a PR description
npx depdet --format md >> pr-body.md

# pipe JSON to an LLM
npx depdet --format json | llm -s "Apply these replacements."

# use a non-standard tsconfig
npx depdet --project tsconfig.build.json
```
