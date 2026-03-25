# no-misleading-return-type

Detect return type annotations that are wider than TypeScript's inferred return type.

## Rule Details

TypeScript allows you to write return type annotations that are **wider (less precise)** than what it actually infers from your code. This silently loses the benefit of literal types, exact unions, and other narrow inferences.

### ❌ Invalid (warning)

```ts
// Record<string, string> is wider than the inferred as const map
function getErrorMessages(): Record<string, string> {
  return {
    INVALID_TOKEN: 'Please log in again.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}

// string is wider than the inferred "loading" | "idle" (multi-return)
function getStatus(loading: boolean): string {
  if (loading) return 'loading';
  return 'idle';
}

// Promise<string> is wider than Promise<"a" | "b"> (async multi-return)
async function getStatus(x: boolean): Promise<string> {
  if (x) return 'a';
  return 'b';
}
```

### ✅ Valid (no warning)

```ts
// No annotation — TypeScript infers the precise type
function getErrorMessages() {
  return {
    INVALID_TOKEN: 'Please log in again.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}

// Single literal return — widened by this rule to approximate TS return type inference
function getStatus(): string {
  return 'idle';
}
function getCode(): number {
  return 404;
}

// Annotation matches inferred exactly
function getStatus(): 'idle' {
  return 'idle';
}

// No annotation — TypeScript infers precisely
function getStatus() {
  return 'idle';
}

// Escape hatches — intentionally wide
function run(): void {
  console.log('done');
}
function parse(s: string): any {
  return JSON.parse(s);
}

// Async with matching inner type
async function greet(): Promise<'hello'> {
  return 'hello';
}
async function greet(): Promise<string> {
  return 'hello'; // single return — widened to string
}
```

## Options

```ts
type Options = {
  fix?: 'suggestion' | 'autofix' | 'none'; // default: 'suggestion'
};
```

| Option | Effect |
|--------|--------|
| `"suggestion"` | IDE inline suggestions: (1) remove annotation, (2) narrow annotation to inferred type (default) |
| `"autofix"` | Auto-removes the annotation on `--fix`; falls back to suggestion for exported functions |
| `"none"` | Report only, no fix offered |

```ts
// eslint.config.ts
{
  rules: {
    'no-misleading-return-type/no-misleading-return-type': ['warn', { fix: 'autofix' }],
  },
}
```

## When to disable

Some functions intentionally use a wide return type. Suppress with `eslint-disable`:

```ts
// Inferred: "loading" | "idle" — but we expose string for a stable public API contract
// eslint-disable-next-line no-misleading-return-type/no-misleading-return-type
function getStatus(loading: boolean): string {
  if (loading) return 'loading';
  return 'idle';
}
```

## What is skipped (v1 limitations)

| Case | Reason |
|------|--------|
| Single-return literal values | Widened by this rule to their base type (e.g. `"idle"` → `string`) to approximate TypeScript's return type inference |
| Generic functions | Inference depends on call-site |
| Generator functions | Complex iterator typing |
| Getters / setters | Accessor semantics differ |
| `void`, `any`, `unknown`, `never` annotations | Intentional escape hatches |
| `Promise<void>` / `Promise<any>` | Intentional escape hatches |
| Functions with no `return` statement | Void functions — nothing to compare |
| Recursive functions and type-checker exceptions | Any type-resolution failure (circular types, checker errors) silently skips the function rather than crashing the lint run |
| Object literals without `as const` (required string properties) | Contextual typing from the annotation widens literals before inference — `as const` objects bypass this and are still reported |
| Enum literal returns | Enum member types may be over-widened to their base type (e.g. `Status.Idle` → `string` instead of `Status`) |
| Custom thenables | Only `Promise<T>` and `PromiseLike<T>` are unwrapped |
| `T \| undefined` or `T \| void` annotation where inferred has no `undefined` | Implicit undefined return path heuristic — the rule cannot track code paths without explicit `return` |

## How the rule compares types

| Pattern | How inferred type is derived | Example |
|---------|------------------------------|---------|
| Single return / concise arrow | Widened to base type via [`getBaseTypeOfLiteralType`](https://github.com/microsoft/TypeScript/blob/main/src/compiler/checker.ts) (public TS 5.0+ API) | `return "idle"` → compared as `string` |
| Multiple returns | Literal union from return expressions | `return "a"; return "b"` → compared as `"a" \| "b"` |
| Async function | Standard `Promise<T>` unwrapped; inner type compared | `Promise<string>` vs inner `"a" \| "b"` |
| `as const` object | Preserved as-is (not affected by widening) | `{ A: "a" } as const` stays readonly |
| Plain object without `as const` | Contextual typing may widen before comparison — often skipped | `{ type: "idle" }` may become `{ type: string }` |
