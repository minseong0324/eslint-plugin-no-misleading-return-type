import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { containsAny } from '../../src/helpers/contains-any.js';
import { createTypeResolver } from './helpers/create-type.js';

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
