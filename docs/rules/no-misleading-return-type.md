# no-misleading-return-type

Detect return type annotations that are less precise than TypeScript's inferred type.

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

// string is wider than the inferred "idle"
function getStatus(): string {
  return 'idle';
}

// number is wider than the inferred 404
function getCode(): number {
  return 404;
}

// string is wider than the inferred "loading" | "idle"
function getStatus(loading: boolean): string {
  if (loading) return 'loading';
  return 'idle';
}

// Promise<string> is wider than the inferred Promise<"hello">
async function greet(): Promise<string> {
  return 'hello';
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

// Annotation matches inferred
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
```

## Options

```ts
type Options = {
  fix?: 'suggestion' | 'autofix' | 'none'; // default: 'suggestion'
};
```

| Option | Effect |
|--------|--------|
| `"suggestion"` | IDE inline suggestion to remove the annotation (default) |
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
// eslint-disable-next-line no-misleading-return-type/no-misleading-return-type
function getStatus(): string {
  return 'idle'; // Wide type is intentional here
}
```

## What is skipped (v1 limitations)

| Case | Reason |
|------|--------|
| Generic functions | Inference depends on call-site |
| Generator functions | Complex iterator typing |
| Getters / setters | Accessor semantics differ |
| `void`, `any`, `unknown`, `never` annotations | Intentional escape hatches |
| `Promise<void>` / `Promise<any>` | Intentional escape hatches |
| Functions with no `return` statement | Void functions — nothing to compare |
| Recursive functions | Circular type resolution |
| Object literals with required string properties | TypeScript contextual typing widens literals before inference |
