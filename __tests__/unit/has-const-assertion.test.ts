import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ts from 'typescript';
import { hasConstAssertion } from '../../src/helpers/has-const-assertion.js';

function parseExpression(code: string): ts.Expression {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    `const _x = ${code};`,
    ts.ScriptTarget.Latest,
    true,
  );
  const stmt = sourceFile.statements[0] as ts.VariableStatement;
  return stmt.declarationList.declarations[0].initializer as ts.Expression;
}

describe('hasConstAssertion', () => {
  it('"idle" as const → true', () => {
    assert.ok(hasConstAssertion(parseExpression('"idle" as const')));
  });

  it('<const>"idle" → true', () => {
    assert.ok(hasConstAssertion(parseExpression('<const>"idle"')));
  });

  it('("idle" as const) parenthesized → true', () => {
    assert.ok(hasConstAssertion(parseExpression('("idle" as const)')));
  });

  it('(("idle" as const)) double parenthesized → true', () => {
    assert.ok(hasConstAssertion(parseExpression('(("idle" as const))')));
  });

  it('("idle" as const) satisfies string → true', () => {
    assert.ok(
      hasConstAssertion(parseExpression('("idle" as const) satisfies string')),
    );
  });

  it('"idle" satisfies string → false', () => {
    assert.ok(!hasConstAssertion(parseExpression('"idle" satisfies string')));
  });

  it('"idle" plain expression → false', () => {
    assert.ok(!hasConstAssertion(parseExpression('"idle"')));
  });
});
