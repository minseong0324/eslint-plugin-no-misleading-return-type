/**
 * Dedicated unit tests for src/helpers/is-exported.ts
 *
 * isExported is tested indirectly via the rule with `fix: "autofix"`:
 *   - exported functions fall back to suggestion-only (narrowReturnType only, no removeReturnType)
 *   - non-exported functions get the autofix (output field present)
 *
 * Cases A-H mirror the 8 code paths in isExported.
 */

import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from '../integration/_setup.js';

/** Shared error shape for exported functions: suggestion-only with narrowReturnType */
const exportedError = (narrowOutput: string) => ({
  messageId: 'misleadingReturnType' as const,
  suggestions: [
    {
      messageId: 'narrowReturnType' as const,
      output: narrowOutput,
    },
  ],
});

ruleTester.run('isExported — case coverage', noMisleadingReturnType, {
  valid: [],
  invalid: [
    // ── Case A: Direct export declaration ────────────────────────────────────

    {
      name: 'Case A — export function declaration is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export function f(): string { return "a"; return "b"; }`,
      errors: [
        exportedError(
          `export function f(): "a" | "b" { return "a"; return "b"; }`,
        ),
      ],
    },
    {
      name: 'Case A — export default function (anonymous) is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export default function(): string { return "a"; return "b"; }`,
      errors: [
        exportedError(
          `export default function(): "a" | "b" { return "a"; return "b"; }`,
        ),
      ],
    },
    {
      name: 'Case A — non-exported function declaration gets autofix',
      options: [{ fix: 'autofix' }],
      code: `function f(): string { return "a"; return "b"; }`,
      output: `function f() { return "a"; return "b"; }`,
      errors: [{ messageId: 'misleadingReturnType' }],
    },

    // ── Case B: export const with FE / Arrow ─────────────────────────────────

    {
      name: 'Case B — export const arrow function is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export const f = (x: boolean): string => { if (x) return "a"; return "b"; };`,
      errors: [
        exportedError(
          `export const f = (x: boolean): "a" | "b" => { if (x) return "a"; return "b"; };`,
        ),
      ],
    },
    {
      name: 'Case B — non-exported const arrow function gets autofix (removeReturnType)',
      options: [{ fix: 'autofix' }],
      code: `const f = (x: boolean): string => { if (x) return "a"; return "b"; };`,
      output: `const f = (x: boolean) => { if (x) return "a"; return "b"; };`,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
    {
      name: 'Case B — export const function expression is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export const f = function(x: boolean): string { if (x) return "a"; return "b"; };`,
      errors: [
        exportedError(
          `export const f = function(x: boolean): "a" | "b" { if (x) return "a"; return "b"; };`,
        ),
      ],
    },

    // ── Case C: export class method ──────────────────────────────────────────

    {
      name: 'Case C — method in export class declaration is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export class C { m(x: boolean): string { if (x) return "a"; return "b"; } }`,
      errors: [
        exportedError(
          `export class C { m(x: boolean): "a" | "b" { if (x) return "a"; return "b"; } }`,
        ),
      ],
    },
    {
      name: 'Case C — method in export default class is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export default class { m(x: boolean): string { if (x) return "a"; return "b"; } }`,
      errors: [
        exportedError(
          `export default class { m(x: boolean): "a" | "b" { if (x) return "a"; return "b"; } }`,
        ),
      ],
    },
    {
      name: 'Case C — method in non-exported class gets autofix',
      options: [{ fix: 'autofix' }],
      code: `class C { m(x: boolean): string { if (x) return "a"; return "b"; } }`,
      output: `class C { m(x: boolean) { if (x) return "a"; return "b"; } }`,
      errors: [{ messageId: 'misleadingReturnType' }],
    },

    // ── Case D: Indirect export — function declaration ───────────────────────

    {
      name: 'Case D — function declaration with export { f } is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `function f(x: boolean): string { if (x) return "a"; return "b"; }\nexport { f };`,
      errors: [
        exportedError(
          `function f(x: boolean): "a" | "b" { if (x) return "a"; return "b"; }\nexport { f };`,
        ),
      ],
    },
    {
      name: 'Case D — function declaration with renamed export { f as g } is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `function f(x: boolean): string { if (x) return "a"; return "b"; }\nexport { f as g };`,
      errors: [
        exportedError(
          `function f(x: boolean): "a" | "b" { if (x) return "a"; return "b"; }\nexport { f as g };`,
        ),
      ],
    },

    // ── Case E: Indirect export — const arrow ────────────────────────────────

    {
      name: 'Case E — const arrow with export { f } is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `const f = (x: boolean): string => { if (x) return "a"; return "b"; };\nexport { f };`,
      errors: [
        exportedError(
          `const f = (x: boolean): "a" | "b" => { if (x) return "a"; return "b"; };\nexport { f };`,
        ),
      ],
    },
    {
      name: 'Case E — const function expression with export { f } is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `const f = function(x: boolean): string { if (x) return "a"; return "b"; };\nexport { f };`,
      errors: [
        exportedError(
          `const f = function(x: boolean): "a" | "b" { if (x) return "a"; return "b"; };\nexport { f };`,
        ),
      ],
    },

    // ── Case F: Class method in indirectly exported class ────────────────────

    {
      name: 'Case F — method in class declaration with export { C } is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `class C { m(x: boolean): string { if (x) return "a"; return "b"; } }\nexport { C };`,
      errors: [
        exportedError(
          `class C { m(x: boolean): "a" | "b" { if (x) return "a"; return "b"; } }\nexport { C };`,
        ),
      ],
    },
    {
      name: 'Case F — method in class expression (const C = class) with export { C } is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `const C = class { m(x: boolean): string { if (x) return "a"; return "b"; } };\nexport { C };`,
      errors: [
        exportedError(
          `const C = class { m(x: boolean): "a" | "b" { if (x) return "a"; return "b"; } };\nexport { C };`,
        ),
      ],
    },

    // ── Case G: Object literal method in exported const ──────────────────────

    {
      name: 'Case G — method in export const object literal is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export const api = { m(x: boolean): string { if (x) return "a"; return "b"; } };`,
      errors: [
        exportedError(
          `export const api = { m(x: boolean): "a" | "b" { if (x) return "a"; return "b"; } };`,
        ),
      ],
    },
    {
      name: 'Case G — method in export default object literal is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export default { m(x: boolean): string { if (x) return "a"; return "b"; } };`,
      errors: [
        exportedError(
          `export default { m(x: boolean): "a" | "b" { if (x) return "a"; return "b"; } };`,
        ),
      ],
    },
    {
      name: 'Case G — method in non-exported object literal gets autofix',
      options: [{ fix: 'autofix' }],
      code: `const api = { m(x: boolean): string { if (x) return "a"; return "b"; } };`,
      output: `const api = { m(x: boolean) { if (x) return "a"; return "b"; } };`,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
    {
      name: 'Case G — method in nested object inside export const is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export const api = { nested: { m(x: boolean): string { if (x) return "a"; return "b"; } } };`,
      errors: [
        exportedError(
          `export const api = { nested: { m(x: boolean): "a" | "b" { if (x) return "a"; return "b"; } } };`,
        ),
      ],
    },

    // ── Case H: CJS export = ─────────────────────────────────────────────────

    {
      name: 'Case H — export = function is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export = function(x: boolean): string { if (x) return "a"; return "b"; };`,
      errors: [
        exportedError(
          `export = function(x: boolean): "a" | "b" { if (x) return "a"; return "b"; };`,
        ),
      ],
    },

    // ── Edge cases ───────────────────────────────────────────────────────────

    {
      name: 'Edge — method in export default class extending another class is exported (suggestion only)',
      options: [{ fix: 'autofix' }],
      code: `export default class extends Array { m(x: boolean): string { if (x) return "a"; return "b"; } }`,
      errors: [
        exportedError(
          `export default class extends Array { m(x: boolean): "a" | "b" { if (x) return "a"; return "b"; } }`,
        ),
      ],
    },
  ],
});
