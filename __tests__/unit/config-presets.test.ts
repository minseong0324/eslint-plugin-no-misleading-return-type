import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { configs } from '../../src/index.js';

describe('config presets', () => {
  it('recommended config sets warn severity', () => {
    assert.equal(
      configs.recommended.rules[
        'no-misleading-return-type/no-misleading-return-type'
      ],
      'warn',
    );
  });

  it('strict config sets error severity', () => {
    assert.equal(
      configs.strict.rules[
        'no-misleading-return-type/no-misleading-return-type'
      ],
      'error',
    );
  });

  it('autofix config sets warn with autofix option', () => {
    const rule =
      configs.autofix.rules[
        'no-misleading-return-type/no-misleading-return-type'
      ];
    assert.ok(Array.isArray(rule));
    assert.equal(rule[0], 'warn');
    assert.deepEqual(rule[1], { fix: 'autofix' });
  });

  it('all configs include the plugin', () => {
    for (const [name, config] of Object.entries(configs)) {
      assert.ok(
        config.plugins['no-misleading-return-type'],
        `${name} config should include the plugin`,
      );
    }
  });
});
