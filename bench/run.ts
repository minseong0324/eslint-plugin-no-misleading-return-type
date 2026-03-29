import { ESLint } from 'eslint';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const eslint = new ESLint({
    overrideConfigFile: join(__dirname, 'bench-eslint.config.ts'),
    cwd: __dirname,
  });

  const start = performance.now();
  const results = await eslint.lintFiles(
    join(__dirname, 'fixtures', 'large.ts'),
  );
  const elapsed = performance.now() - start;

  const warningCount = results.reduce(
    (sum, r) => sum + r.errorCount + r.warningCount,
    0,
  );
  console.log(
    `Linted 1000 functions in ${elapsed.toFixed(0)}ms (${warningCount} warnings)`,
  );

  if (elapsed > 30000) {
    console.error('FAIL: Performance regression detected (>30s)');
    process.exit(1);
  }
}

main();
