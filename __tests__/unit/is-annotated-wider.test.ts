import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createTypeResolver } from './helpers/create-type.js';

// Mirrors isAnnotatedWiderThanInferred from the rule's create() closure
function isAnnotatedWiderThanInferred(
  checker: ReturnType<typeof createTypeResolver>['checker'],
  annotated: import('typescript').Type,
  inferred: import('typescript').Type,
) {
  return (
    checker.isTypeAssignableTo(inferred, annotated) &&
    !checker.isTypeAssignableTo(annotated, inferred)
  );
}

describe('isAnnotatedWiderThanInferred', () => {
  it("string is wider than 'idle'", () => {
    const r = createTypeResolver(`
      type Annotated = string
      const inferred = 'idle' as const
    `);
    assert.ok(
      isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('inferred'),
      ),
    );
  });

  it('number is wider than 42', () => {
    const r = createTypeResolver(`
      type Annotated = number
      const inferred = 42 as const
    `);
    assert.ok(
      isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('inferred'),
      ),
    );
  });

  it('boolean is wider than true', () => {
    const r = createTypeResolver(`
      type Annotated = boolean
      const inferred = true as const
    `);
    assert.ok(
      isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('inferred'),
      ),
    );
  });

  it("string | number is wider than 'idle'", () => {
    const r = createTypeResolver(`
      type Annotated = string | number
      const inferred = 'idle' as const
    `);
    assert.ok(
      isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('inferred'),
      ),
    );
  });

  it('string is not wider than string', () => {
    const r = createTypeResolver(`
      type Annotated = string
      type Inferred = string
    `);
    assert.ok(
      !isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('Inferred'),
      ),
    );
  });

  it('number is not wider than number', () => {
    const r = createTypeResolver(`
      type Annotated = number
      type Inferred = number
    `);
    assert.ok(
      !isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('Inferred'),
      ),
    );
  });

  it('{ name: string } is not wider than { name: string }', () => {
    const r = createTypeResolver(`
      type Annotated = { name: string }
      type Inferred = { name: string }
    `);
    assert.ok(
      !isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('Inferred'),
      ),
    );
  });

  it('null is not wider than null', () => {
    const r = createTypeResolver(`
      type Annotated = null
      type Inferred = null
    `);
    assert.ok(
      !isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('Inferred'),
      ),
    );
  });

  it("'idle' is not wider than string (annotated is narrower)", () => {
    const r = createTypeResolver(`
      type Annotated = 'idle'
      type Inferred = string
    `);
    assert.ok(
      !isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('Inferred'),
      ),
    );
  });

  it('[number, string] is not wider than (string | number)[]', () => {
    const r = createTypeResolver(`
      type Annotated = [number, string]
      type Inferred = (string | number)[]
    `);
    assert.ok(
      !isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('Inferred'),
      ),
    );
  });

  it('string is not wider than number (completely unrelated — TS would error)', () => {
    const r = createTypeResolver(`
      type Annotated = string
      type Inferred = number
    `);
    assert.ok(
      !isAnnotatedWiderThanInferred(
        r.checker,
        r.getType('Annotated'),
        r.getType('Inferred'),
      ),
    );
  });
});
