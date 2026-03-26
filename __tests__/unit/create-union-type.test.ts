import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createUnionType } from '../../src/helpers/create-union-type.js';
import { createTypeResolver } from './helpers/create-type.js';

describe('createUnionType', () => {
  it('creates a union type from two distinct types', () => {
    const r = createTypeResolver(`
      type A = "hello"
      type B = "world"
    `);
    const typeA = r.getType('A');
    const typeB = r.getType('B');
    const union = createUnionType(r.checker, [typeA, typeB]);
    assert.ok(union !== undefined, 'union should not be undefined');
    assert.ok(union.isUnion(), 'result should be a union type');
  });

  it('union members include both input types', () => {
    const r = createTypeResolver(`
      type A = "foo"
      type B = "bar"
    `);
    const typeA = r.getType('A');
    const typeB = r.getType('B');
    const union = createUnionType(r.checker, [typeA, typeB]);
    assert.ok(union !== undefined);
    assert.ok(union.isUnion());
    const memberStrings = union.types.map((t) => r.checker.typeToString(t));
    assert.ok(memberStrings.includes('"foo"'), 'union should include "foo"');
    assert.ok(memberStrings.includes('"bar"'), 'union should include "bar"');
  });

  it('returns undefined if internal API unavailable', () => {
    const r = createTypeResolver(`type A = string`);
    // Simulate missing internal API
    const fakeChecker = { ...r.checker, getUnionType: undefined };
    const result = createUnionType(fakeChecker as any, [r.getType('A')]);
    assert.strictEqual(result, undefined);
  });
});
