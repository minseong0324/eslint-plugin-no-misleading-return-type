# no-misleading-return-type

Detect return type annotations that are misleadingly wider than what your implementation actually returns.

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

// Single literal return — widened to base type to match TS return type inference
function getStatus(): string { return 'idle'; }
function getCode(): number { return 404; }

// Multi-return union — annotation matches inferred union
function getStatus(loading: boolean): "loading" | "idle" {
  if (loading) return "loading";
  return "idle";
}

// Escape hatches — intentionally wide
function run(): void { console.log('done'); }
function parse(s: string): any { return JSON.parse(s); }

// Async with matching inner type
async function greet(): Promise<string> { return 'hello'; } // single return — widened to string
```

## Options

```ts
type Options = {
  fix?: 'suggestion' | 'autofix' | 'none'; // default: 'suggestion'
};
```

| Option | Effect |
|--------|--------|
| `"suggestion"` | IDE inline suggestions: (1) remove annotation (non-exported only), (2) narrow annotation to inferred type (default) |
| `"autofix"` | Auto-removes the annotation on `--fix`; falls back to suggestion for exported functions to avoid breaking `isolatedDeclarations` |
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

## What is not checked

### Common cases

| Case | Reason |
|------|--------|
| Single literal return values | Widened by this rule to their base type (e.g. `"idle"` → `string`) to approximate TypeScript's return type inference |
| Generic functions with complex type constructs in annotation | When the return type uses conditional (`T extends X ? Y : Z`), mapped (`{ [K in keyof T]: V }`), index (`keyof T`), or indexed access (`T[K]`) types, inference is deferred and comparison is unreliable. Simple type parameter usage (`: T`, `: T[]`, `: T \| null`) **is** checked |
| Generator functions | Complex iterator typing |
| Object literals without `as const` | Contextual typing from the annotation widens property literals before inference — `as const` objects bypass this and are still reported |
| `T \| undefined` or `T \| void` annotation where inferred has no `undefined` | Implicit undefined return path heuristic — the rule cannot track code paths without explicit `return` |

### Edge cases

| Case | Reason |
|------|--------|
| `void`, `any`, `unknown`, `never` annotations | Intentional escape hatches |
| `Promise<void>` / `Promise<any>` / `Promise<unknown>` / `Promise<never>` | Intentional escape hatches |
| Getter+setter pairs | Getter return type must be consistent with setter parameter type |
| Functions with no `return` statement | Void functions — nothing to compare |
| Recursive functions and type-checker exceptions | Any type-resolution failure (circular types, checker errors) silently skips the function rather than crashing the lint run |
| Enum literal returns | Single enum member returns are widened to the enum type (e.g. `Status.Idle` → `Status`), matching TypeScript's inference. Multi-member returns may vary |
| Custom thenables | Only `Promise<T>` is unwrapped — `PromiseLike<T>` and other thenables are not valid async return types (TS1064) |
| Overloaded function implementations | Intentionally wider to cover all overload signatures |
| `override` methods | Must match parent class return type. May miss narrowable overrides (trade-off) |
| `declare` functions / abstract methods | No body to analyze |

## How the rule compares types

| Pattern | How inferred type is derived | Example |
|---------|------------------------------|---------|
| Single return / concise arrow | Widened to base type via `getBaseTypeOfLiteralType` (unless already a union, which is preserved as-is) | `return "idle"` → compared as `string` |
| Multiple returns | Literal union from return expressions | `return "a"; return "b"` → compared as `"a" \| "b"` |
| Async function | `Promise<T>` unwrapped; inner type compared (TS requires async return types to be exactly `Promise<T>` — TS1064) | `Promise<string>` vs inner `"a" \| "b"` |
| `as const` object | Preserved as-is (not affected by widening) | `{ A: "a" } as const` stays readonly |
| Plain object without `as const` | Contextual typing may widen before comparison — often skipped | `{ type: "idle" }` may become `{ type: string }` |
