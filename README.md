# eslint-plugin-no-misleading-return-type

Detect return type annotations that are less precise than TypeScript's inferred type.

## Why this rule?

TypeScript allows explicit return type annotations that are **wider** than what the implementation actually returns. This silently discards the precision you deliberately built into your code.

```ts
// The implementation returns a precise error message map,
// but the explicit return type widens it to Record<string, string>.
function getErrorMessages(): Record<string, string> {
  return {
    INVALID_TOKEN: 'Please log in again.',
    RATE_LIMITED: 'Too many requests. Try again later.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}

// Better: let TypeScript infer the precise type.
function getErrorMessages() {
  return {
    INVALID_TOKEN: 'Please log in again.',
    RATE_LIMITED: 'Too many requests. Try again later.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}
```

This rule reports when an annotated return type is wider than what TypeScript would infer, helping you remove unnecessary annotations and preserve the precision your implementation provides.

## Installation

```bash
# npm
npm install -D eslint-plugin-no-misleading-return-type
# yarn
yarn add -D eslint-plugin-no-misleading-return-type
# pnpm
pnpm add -D eslint-plugin-no-misleading-return-type
```

**Requirements:**
- Node.js >= 22.12.0
- ESLint `^9.0.0 || ^10.0.0`
- TypeScript `>=5.0.0 <6.0.0` (tested: 5.0–5.9)
- `@typescript-eslint/parser` with type information enabled

## Setup

Add the plugin to your ESLint flat config with TypeScript support:

```ts
// eslint.config.ts
import noMisleadingReturnType from "eslint-plugin-no-misleading-return-type";
// or: import * as noMisleadingReturnType from "eslint-plugin-no-misleading-return-type";
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

**Type information is required.** Use either:
- `projectService: { allowDefaultProject: [...] }` (ESLint 9+, recommended)
- `project: "./tsconfig.json"` (classic setup)

> If you see `TypeError: Cannot read properties of undefined (reading 'program')`,
> type information is not configured. Check your `parserOptions`.

## Rule: `no-misleading-return-type`

### What it checks

Reports when a function's explicit return type annotation is **wider** than TypeScript's inferred type.

- **Reports:** Annotated type is wider than inferred (e.g., `Record<string, string>` vs `{ readonly INVALID_TOKEN: "..." }`)
- **Does not report:** Annotated type equals inferred or is narrower
- **Does not report:** No annotation, `void`, `any`, `unknown`, `never`, generators, generics, getters/setters, overloads, async `Promise<void|any>`

### Valid (no warning)

```ts
// No annotation — TypeScript infers the precise type
function getErrorMessages() {
  return {
    INVALID_TOKEN: 'Please log in again.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}

// Annotation matches inferred
function getStatus(): "idle" { return "idle"; }

// Escape hatches (intentionally wide types)
function run(): void { console.log("done"); }
function parse(s: string): any { return JSON.parse(s); }

// Async with matching inner type
async function greet(): Promise<"hello"> { return "hello"; }
```

### Invalid (warning)

```ts
// as const map widened by explicit annotation
function getErrorMessages(): Record<string, string> {
  return {
    INVALID_TOKEN: 'Please log in again.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}

// Literal types widened
function getStatus(): string { return "idle"; }  // string > "idle"
function getCode(): number { return 404; }       // number > 404

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

## What is not checked

| Case | Reason |
|------|--------|
| Generic functions | Inference depends on call-site |
| Generator functions | Complex iterator typing |
| Getters / setters | Accessor semantics differ |
| `void`, `any`, `unknown`, `never` | Intentional escape hatches |
| `Promise<void>` / `Promise<any>` | Intentional escape hatches |
| Functions with no `return` | Void functions — nothing to compare |
| Recursive functions | Circular type resolution |
| Object literals with required string properties | TypeScript contextual typing widens literals before inference |

## When to intentionally widen

Some functions legitimately have wide return types. Use `eslint-disable` to suppress the warning:

```ts
// Inferred: "loading" | "idle" — but we expose string for a stable public API contract
// eslint-disable-next-line no-misleading-return-type/no-misleading-return-type
function getStatus(loading: boolean): string {
  if (loading) return 'loading';
  return 'idle';
}
```

## License

MIT — See [LICENSE](./LICENSE)
