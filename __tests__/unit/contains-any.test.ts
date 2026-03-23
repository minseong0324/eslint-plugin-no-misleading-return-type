import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ts from 'typescript';
import { createTypeResolver } from './helpers/create-type.js';

// Mirrors containsAny from the rule's create() closure
function containsAny(
  checker: ReturnType<typeof createTypeResolver>['checker'],
  type: ts.Type,
): boolean {
  if (type.flags & ts.TypeFlags.Any) {
    return true;
  }
  if (type.isUnion()) {
    return type.types.some((t) => containsAny(checker, t));
  }
  if (type.isIntersection()) {
    return type.types.some((t) => containsAny(checker, t));
  }
  if (
    type.flags & ts.TypeFlags.Object &&
    (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference
  ) {
    return checker
      .getTypeArguments(type as ts.TypeReference)
      .some((t) => containsAny(checker, t));
  }
  return false;
}

describe('containsAny', () => {
  it('any contains any', () => {
    const r = createTypeResolver(`type T = any`);
    assert.ok(containsAny(r.checker, r.getType('T')));
  });

  it('Promise<any> contains any', () => {
    const r = createTypeResolver(`const x: Promise<any> = Promise.resolve()`);
    assert.ok(containsAny(r.checker, r.getType('x')));
  });

  it('Array<any> contains any', () => {
    const r = createTypeResolver(`const x: Array<any> = []`);
    assert.ok(containsAny(r.checker, r.getType('x')));
  });

  it('string | any contains any — collapses to any in TypeScript', () => {
    // TypeScript collapses `string | any` to `any`, so TypeFlags.Any is set
    const r = createTypeResolver(`type T = string | any`);
    assert.ok(containsAny(r.checker, r.getType('T')));
  });

  it('string does not contain any', () => {
    const r = createTypeResolver(`type T = string`);
    assert.ok(!containsAny(r.checker, r.getType('T')));
  });

  it('Promise<string> does not contain any', () => {
    const r = createTypeResolver(
      `const x: Promise<string> = Promise.resolve('hello')`,
    );
    assert.ok(!containsAny(r.checker, r.getType('x')));
  });

  it('string | number does not contain any', () => {
    const r = createTypeResolver(`type T = string | number`);
    assert.ok(!containsAny(r.checker, r.getType('T')));
  });
});
