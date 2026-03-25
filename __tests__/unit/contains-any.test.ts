import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ts from 'typescript';
import { createTypeResolver } from './helpers/create-type.js';

// Mirrors containsAny from the rule's create() closure
function containsAny(
  checker: ReturnType<typeof createTypeResolver>['checker'],
  type: ts.Type,
  visited = new Set<ts.Type>(),
): boolean {
  if (visited.has(type)) {
    return false;
  }
  visited.add(type);

  if (type.flags & ts.TypeFlags.Any) {
    return true;
  }

  if (type.isUnion() || type.isIntersection()) {
    return type.types.some((t) => containsAny(checker, t, visited));
  }

  if (
    type.flags & ts.TypeFlags.Object &&
    (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference
  ) {
    return checker
      .getTypeArguments(type as ts.TypeReference)
      .some((t) => containsAny(checker, t, visited));
  }

  // Object properties
  if (type.flags & ts.TypeFlags.Object) {
    for (const prop of type.getProperties()) {
      const propType = checker.getTypeOfSymbol(prop);
      if (containsAny(checker, propType, visited)) {
        return true;
      }
    }
    const stringIndex = type.getStringIndexType();
    if (stringIndex && containsAny(checker, stringIndex, visited)) {
      return true;
    }
    const numberIndex = type.getNumberIndexType();
    if (numberIndex && containsAny(checker, numberIndex, visited)) {
      return true;
    }
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

  // Deep traversal: object properties
  it('object with any property contains any', () => {
    const r = createTypeResolver(`type T = { name: any }`);
    assert.ok(containsAny(r.checker, r.getType('T')));
  });

  it('nested object with deep any contains any', () => {
    const r = createTypeResolver(`type T = { nested: { deep: any } }`);
    assert.ok(containsAny(r.checker, r.getType('T')));
  });

  it('index signature with any value contains any', () => {
    const r = createTypeResolver(`type T = { [key: string]: any }`);
    assert.ok(containsAny(r.checker, r.getType('T')));
  });

  it('plain object without any does not contain any', () => {
    const r = createTypeResolver(`type T = { name: string; age: number }`);
    assert.ok(!containsAny(r.checker, r.getType('T')));
  });
});
