import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import plugin, { configs, meta, rules } from '../../src/index.js';

describe('plugin exports', () => {
  it('exports meta with name and version', () => {
    assert.ok(meta.name);
    assert.ok(meta.version);
    assert.match(meta.version, /^\d+\.\d+\.\d+/);
  });

  it('default export includes meta', () => {
    assert.deepStrictEqual(plugin.meta, meta);
  });

  it('exports rules object with no-misleading-return-type', () => {
    assert.ok(rules['no-misleading-return-type']);
    assert.strictEqual(
      typeof rules['no-misleading-return-type'].create,
      'function',
    );
    assert.strictEqual(
      typeof rules['no-misleading-return-type'].meta,
      'object',
    );
  });

  it('default export includes rules', () => {
    assert.deepStrictEqual(plugin.rules, rules);
  });

  it('exports recommended config with correct structure', () => {
    assert.ok(configs.recommended);
    assert.ok(configs.recommended.plugins['no-misleading-return-type']);
    assert.ok(
      configs.recommended.rules[
        'no-misleading-return-type/no-misleading-return-type'
      ],
    );
  });

  it('recommended config references the same plugin object', () => {
    const configPlugin =
      configs.recommended.plugins['no-misleading-return-type'];
    assert.strictEqual(configPlugin.rules, rules);
    assert.strictEqual(configPlugin.meta, meta);
  });

  it('default export includes configs', () => {
    assert.ok(plugin.configs);
    assert.deepStrictEqual(plugin.configs, configs);
  });
});
