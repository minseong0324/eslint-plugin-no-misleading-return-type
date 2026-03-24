# eslint-plugin-no-misleading-return-type

Detect return type annotations that are less precise than TypeScript's inferred type.

## Why this rule?

TypeScript's type checker allows you to write return type annotations that are **wider (less precise)** than what TypeScript actually infers from your code. This causes silent precision loss — you lose the benefit of literal types, exact unions, and other narrow inferences.

```ts
// TypeScript infers "idle", but accepts string
function getStatus(): string { return "idle"; }  // No error!

// Better: let TypeScript infer the precise type
function getStatus() { return "idle"; }          // Type: "idle"
```

This rule detects and reports when an annotated type is wider than the inferred type, helping you remove unnecessary annotations and keep your types sharp.

## Installation

```bash
pnpm add -D eslint-plugin-no-misleading-return-type
```

Requires:
- ESLint >= 10.1
- TypeScript >= 5.0
- `@typescript-eslint/parser` with type information enabled

## Setup

Add the plugin to your ESLint flat config with TypeScript support:

```ts
// eslint.config.ts
import * as noMisleadingReturnType from "eslint-plugin-no-misleading-return-type";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.ts", "*.tsx"],
        },
      },
    },
    plugins: {
      "no-misleading-return-type": noMisleadingReturnType,
    },
    rules: {
      "no-misleading-return-type/no-misleading-return-type": "warn",
    },
  },
];
```

**Important:** Type information is required. Use either:
- `projectService: { allowDefaultProject: [...] }` (ESLint 9+, recommended)
- `project: "./tsconfig.json"` (classic setup)

## Rule: `no-misleading-return-type`

### What it checks

Reports when a function's explicit return type annotation is **wider** than TypeScript's inferred type.

- **Reports:** Annotated type is wider than inferred (e.g., `string` vs `"idle"`)
- **Does not report:** Annotated type equals inferred or is narrower
- **Does not report:** No annotation, void, any, unknown, never, generators, generics, getters/setters, overloads, async `Promise<void|any>`

### Valid (no warning)

```ts
// Annotation matches inferred
function getStatus(): "idle" { return "idle"; }

// No annotation — inferred automatically
function getStatus() { return "idle"; }

// Escape hatches (intentionally wide types)
function run(): void { console.log("done"); }
function parse(): any { return JSON.parse(s); }

// Async with matching inner type
async function greet(): Promise<"hello"> { return "hello"; }
```

### Invalid (warning)

```ts
// Annotation wider than inferred
function getStatus(): string { return "idle"; }  // string > "idle"
function getCode(): number { return 404; }       // number > 404
function isOn(): boolean { return true; }        // boolean > true

// Async function with wide Promise inner type
async function greet(): Promise<string> { return "hello"; }  // Promise<string> > Promise<"hello">

// Multi-return with union widening
function getStatus(loading: boolean): string {
  if (loading) return "loading";
  return "idle";                                 // inferred: "loading" | "idle", annotation: string
}
```

### Options

| Option | Type | Default | Effect |
|--------|------|---------|--------|
| `fix` | `"suggestion" \| "autofix" \| "none"` | `"suggestion"` | How to offer fixes |

**fix modes:**
- `"suggestion"` — IDE inline suggestion to remove annotation (safe for exported functions)
- `"autofix"` — Auto-removes annotation (falls back to suggestion for exported functions with `isolatedDeclarations`)
- `"none"` — Report without any fix

**Example:**

```ts
// eslint.config.ts
{
  rules: {
    "no-misleading-return-type/no-misleading-return-type": [
      "warn",
      { fix: "autofix" }
    ],
  },
}
```

## When to intentionally widen

Some functions legitimately have wide return types. Use `eslint-disable` to suppress the warning:

```ts
// eslint-disable-next-line no-misleading-return-type/no-misleading-return-type
function parse(input: string): any {
  return JSON.parse(input);  // Intentionally returns any
}

// eslint-disable-next-line no-misleading-return-type/no-misleading-return-type
function fetch(): Promise<string> {
  return asyncOperation();   // Intentionally wide
}
```

## License

MIT — See [LICENSE](./LICENSE)
