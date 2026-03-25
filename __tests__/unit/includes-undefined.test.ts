import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { includesUndefined } from '../../src/helpers/includes-undefined.js';
import { createTypeResolver } from './helpers/create-type.js';

describe('includesUndefined', () => {
  it('undefined includes undefined', () => {
    const r = createTypeResolver('type T = undefined');
    assert.ok(includesUndefined(r.getType('T')));
  });

  it('void includes undefined', () => {
    const r = createTypeResolver('type T = void');
    assert.ok(includesUndefined(r.getType('T')));
  });

  it('string | undefined includes undefined', () => {
    const r = createTypeResolver('type T = string | undefined');
    assert.ok(includesUndefined(r.getType('T')));
  });

  it('string | void includes undefined', () => {
    const r = createTypeResolver('type T = string | void');
    assert.ok(includesUndefined(r.getType('T')));
  });

  it('intersection with undefined member includes undefined', () => {
    // TypeScript collapses `{ x: string } & undefined` to `never`,
    // but a union containing an intersection with undefined should still work.
    const r = createTypeResolver(
      'type T = (string & { __brand: true }) | undefined',
    );
    assert.ok(includesUndefined(r.getType('T')));
  });

  it('string does not include undefined', () => {
    const r = createTypeResolver('type T = string');
    assert.ok(!includesUndefined(r.getType('T')));
  });

  it('null does not include undefined', () => {
    const r = createTypeResolver('type T = null');
    assert.ok(!includesUndefined(r.getType('T')));
  });

  it('number does not include undefined', () => {
    const r = createTypeResolver('type T = number');
    assert.ok(!includesUndefined(r.getType('T')));
  });
});
