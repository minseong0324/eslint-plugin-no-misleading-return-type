import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isEscapeHatch } from '../../src/helpers/is-escape-hatch.js';
import { createTypeResolver } from './helpers/create-type.js';

describe('isEscapeHatch', () => {
  it('any is escape hatch', () => {
    const r = createTypeResolver(`type T = any`);
    assert.ok(isEscapeHatch(r.getType('T')));
  });

  it('unknown is escape hatch', () => {
    const r = createTypeResolver(`type T = unknown`);
    assert.ok(isEscapeHatch(r.getType('T')));
  });

  it('never is escape hatch', () => {
    const r = createTypeResolver(`type T = never`);
    assert.ok(isEscapeHatch(r.getType('T')));
  });

  it('void is escape hatch', () => {
    const r = createTypeResolver(`type T = void`);
    assert.ok(isEscapeHatch(r.getType('T')));
  });

  it('string is not escape hatch', () => {
    const r = createTypeResolver(`type T = string`);
    assert.ok(!isEscapeHatch(r.getType('T')));
  });

  it('number is not escape hatch', () => {
    const r = createTypeResolver(`type T = number`);
    assert.ok(!isEscapeHatch(r.getType('T')));
  });

  it('object type is not escape hatch', () => {
    const r = createTypeResolver(`type T = { name: string }`);
    assert.ok(!isEscapeHatch(r.getType('T')));
  });
});
