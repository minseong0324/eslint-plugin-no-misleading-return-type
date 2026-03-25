import { createRequire } from 'node:module';
import { noMisleadingReturnType } from './rules/no-misleading-return-type.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

export const meta = {
  name: 'eslint-plugin-no-misleading-return-type',
  version,
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
