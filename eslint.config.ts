import parser from '@typescript-eslint/parser';
import plugin from './src/index.js';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'no-misleading-return-type': plugin,
    },
    rules: {
      'no-misleading-return-type/no-misleading-return-type': 'warn',
    },
  },
];
