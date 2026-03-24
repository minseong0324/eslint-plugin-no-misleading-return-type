import { noMisleadingReturnType } from './rules/no-misleading-return-type.js';

export const meta = {
  name: 'eslint-plugin-no-misleading-return-type',
  version: '0.1.2',
};

export const rules = { 'no-misleading-return-type': noMisleadingReturnType };

const plugin = { meta, rules };

export const configs = {
  recommended: {
    plugins: { 'no-misleading-return-type': plugin },
    rules: {
      'no-misleading-return-type/no-misleading-return-type': 'warn' as const,
    },
  },
};

export default { ...plugin, configs };
