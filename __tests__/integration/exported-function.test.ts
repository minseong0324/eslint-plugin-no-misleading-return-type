import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('exported-function', noMisleadingReturnType, {
  valid: [],
  invalid: [
    {
      name: 'exported function — only narrow suggestion, no remove',
      code: `export function getStatus(loading: boolean): string {
  if (loading) return "loading";
  return "idle";
}`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `export function getStatus(loading: boolean): "loading" | "idle" {
  if (loading) return "loading";
  return "idle";
}`,
            },
          ],
        },
      ],
    },
    {
      name: 'export default function — only narrow suggestion, no remove',
      code: `export default function getCode(x: boolean): number {
  if (x) return 200;
  return 404;
}`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `export default function getCode(x: boolean): 200 | 404 {
  if (x) return 200;
  return 404;
}`,
            },
          ],
        },
      ],
    },
    {
      name: 'non-exported function — both remove and narrow suggestions',
      code: `function getStatus(loading: boolean): string {
  if (loading) return "loading";
  return "idle";
}`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function getStatus(loading: boolean) {
  if (loading) return "loading";
  return "idle";
}`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function getStatus(loading: boolean): "loading" | "idle" {
  if (loading) return "loading";
  return "idle";
}`,
            },
          ],
        },
      ],
    },
    {
      name: 'exported with autofix option — falls back to suggestion for exported',
      code: `export function getStatus(loading: boolean): string {
  if (loading) return "loading";
  return "idle";
}`,
      options: [{ fix: 'autofix' as const }],
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `export function getStatus(loading: boolean): "loading" | "idle" {
  if (loading) return "loading";
  return "idle";
}`,
            },
          ],
        },
      ],
    },
  ],
});
