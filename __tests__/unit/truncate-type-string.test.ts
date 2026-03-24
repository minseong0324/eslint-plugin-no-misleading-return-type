import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { truncateTypeString } from '../../src/helpers/truncate-type-string.js';

describe('truncateTypeString', () => {
  it('returns the string unchanged when within the limit', () => {
    assert.equal(truncateTypeString('string'), 'string');
  });

  it('truncates and appends ... when over the default 80-char limit', () => {
    const long = 'a'.repeat(81);
    const result = truncateTypeString(long);
    assert.equal(result, `${'a'.repeat(80)}...`);
  });

  it('does not truncate at exactly the limit', () => {
    const exact = 'a'.repeat(80);
    assert.equal(truncateTypeString(exact), exact);
  });

  it('respects a custom max', () => {
    const result = truncateTypeString('hello world', 5);
    assert.equal(result, 'hello...');
  });
});
