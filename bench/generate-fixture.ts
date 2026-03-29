import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const lines: string[] = ['// Auto-generated benchmark fixture', ''];

for (let i = 0; i < 500; i++) {
  lines.push(`function misleading${i}(x: boolean): string {`);
  lines.push(`  if (x) return "a${i}";`);
  lines.push(`  return "b${i}";`);
  lines.push('}');
  lines.push('');
}

for (let i = 0; i < 500; i++) {
  lines.push(`function correct${i}(): string {`);
  lines.push('  return "value";');
  lines.push('}');
  lines.push('');
}

mkdirSync(join(__dirname, 'fixtures'), { recursive: true });
writeFileSync(join(__dirname, 'fixtures', 'large.ts'), lines.join('\n'));
console.log('Generated bench/fixtures/large.ts');
