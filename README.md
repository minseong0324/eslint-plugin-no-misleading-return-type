# eslint-plugin-no-misleading-return-type

Detect return type annotations that are misleadingly wider than what your implementation actually returns.

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

This rule reports when an annotated return type is wider than what TypeScript would infer, helping you detect misleadingly wide return annotations and preserve the precision your implementation provides.

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
- Node.js `^18.18.0 || ^20.9.0 || >=21.1.0`
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
- `projectService: { allowDefaultProject: [...] }` (recommended parser setup)
- `project: "./tsconfig.json"` (classic tsconfig-based setup)

> If you see `TypeError: Cannot read properties of undefined (reading 'program')`,
> type information is not configured. Check your `parserOptions`.

## Config Presets

Instead of manual rule configuration, you can use one of the built-in presets.
**Note:** You still need to configure `languageOptions` with `@typescript-eslint/parser` and type information.

```ts
// eslint.config.ts
import noMisleadingReturnType from "eslint-plugin-no-misleading-return-type";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser,
      parserOptions: { projectService: { allowDefaultProject: ["*.ts", "*.tsx"] } },
    },
    ...noMisleadingReturnType.configs.recommended, // warn + suggestion (default)
    // ...noMisleadingReturnType.configs.strict,    // error + suggestion
    // ...noMisleadingReturnType.configs.autofix,   // warn + autofix
  },
];
```

| Preset | Severity | Fix mode |
|--------|----------|----------|
| `recommended` | `warn` | `suggestion` |
| `strict` | `error` | `suggestion` |
| `autofix` | `warn` | `autofix` |

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

// Single literal return — widened by this rule to approximate TS return type inference
function getStatus(): string { return "idle"; }
function getCode(): number { return 404; }

// Annotation matches inferred
function getStatus(): "idle" { return "idle"; }

// Escape hatches (intentionally wide types)
function run(): void { console.log("done"); }
function parse(s: string): any { return JSON.parse(s); }

// Async with matching inner type
async function greet(): Promise<"hello"> { return "hello"; }
async function greet(): Promise<string> { return "hello"; }  // single return — widened to string
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

// Multi-return with union widening
function getStatus(loading: boolean): string {
  if (loading) return "loading";
  return "idle";                                 // inferred: "loading" | "idle", annotation: string
}

// Async multi-return
async function getStatus(x: boolean): Promise<string> {
  if (x) return "a";
  return "b";                                    // inferred: Promise<"a" | "b">, annotation: Promise<string>
}
```

### Options

| Option | Type | Default | Effect |
|--------|------|---------|--------|
| `fix` | `"suggestion" \| "autofix" \| "none"` | `"suggestion"` | How to offer fixes |

**fix modes:**
- `"suggestion"` — IDE inline suggestions: (1) remove annotation, (2) narrow annotation to inferred type
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

## How this rule approximates inference

This rule uses TypeScript's type checker APIs to approximate the inferred return type. It is **not** a full re-implementation of TypeScript's inference engine.

- **Single return:** Widened via `getBaseTypeOfLiteralType` (matches TS signature inference)
- **Multiple returns:** Literal union from return expressions (matches TS union inference)
- **Async functions:** Standard `Promise<T>` / `PromiseLike<T>` unwrapped; inner type compared

This approach covers the vast majority of real-world cases. See [What is not checked](#what-is-not-checked) for known limitations.

## What is not checked

### Common cases

Cases you are likely to encounter in everyday code:

| Case | Reason |
|------|--------|
| Single literal return values | Widened by this rule to their base type (e.g. `"idle"` → `string`) to approximate TypeScript's return type inference |
| Generic functions | Inference depends on call-site instantiation |
| Generator functions | Complex iterator typing |
| Object literals without `as const` (required string properties) | Contextual typing from the annotation widens literals before inference — `as const` objects bypass this and are still reported |
| `T \| undefined` or `T \| void` annotation where inferred has no `undefined` | Implicit undefined return path heuristic — the rule cannot track code paths without explicit `return` |

### Edge cases

Rare scenarios requiring specialized handling:

| Case | Reason |
|------|--------|
| `void`, `any`, `unknown`, `never` annotations | Intentional escape hatches |
| `Promise<void>` / `Promise<any>` | Intentional escape hatches |
| Getter / setter accessors | Accessor semantics differ |
| Functions with no `return` statement | Void functions — nothing to compare |
| Recursive functions and type-checker exceptions | Any type-resolution failure (circular types, checker errors) silently skips the function rather than crashing the lint run |
| Enum literal returns | Enum member types may be over-widened to their base type (e.g. `Status.Idle` → `string` instead of `Status`) |
| Custom thenables | Only `Promise<T>` and `PromiseLike<T>` are unwrapped |
| Overloaded function implementations | Intentionally wider to cover all overload signatures |
| `override` methods | Must match parent class return type. May miss narrowable overrides (trade-off) |
| `declare` functions / abstract methods | No body to analyze |

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

## Troubleshooting

**The rule reports nothing**
- Ensure type information is configured (`projectService` or `project` in parserOptions)
- Check that the file is included in your TypeScript project
- Functions without return type annotations are intentionally skipped

**The rule reports too much**
- Single literal returns (e.g., `return "idle"`) are widened to match TS inference — this is expected
- Object literal properties without `as const` may be contextually typed — use `as const` for precise types
- Use `eslint-disable` for intentionally wide return types (e.g., stable API contracts)

## License

MIT — See [LICENSE](./LICENSE)
