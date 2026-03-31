import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ts from 'typescript';
import { collectReturns } from '../../src/helpers/collect-return-types.js';
import { getFunctionFromCode } from './helpers/create-function.js';

function getInferredTypes(code: string, funcName: string) {
  const { node, checker } = getFunctionFromCode(code, funcName);
  if (!node.body || !ts.isBlock(node.body)) {
    // Concise body arrow — return the expression type directly
    if (ts.isArrowFunction(node) && node.body && !ts.isBlock(node.body)) {
      return [checker.getTypeAtLocation(node.body)];
    }
    return [];
  }
  return collectReturns(checker, node.body).map((r) => r.type);
}

describe('collectReturns', () => {
  it('returns string literal type from single return', () => {
    const types = getInferredTypes(`function foo() { return 'hello' }`, 'foo');
    assert.strictEqual(types.length, 1);
    assert.ok(types[0].flags & ts.TypeFlags.StringLiteral);
  });

  it('returns number literal type from single return', () => {
    const types = getInferredTypes(`function foo() { return 42 }`, 'foo');
    assert.strictEqual(types.length, 1);
    assert.ok(types[0].flags & ts.TypeFlags.NumberLiteral);
  });

  it('returns union type from multiple returns', () => {
    const types = getInferredTypes(
      `function foo(x: boolean) { if (x) return 'a'; return 'b' }`,
      'foo',
    );
    assert.strictEqual(types.length, 2);
  });

  it('returns empty array for void function (no return statements)', () => {
    const types = getInferredTypes(
      `function foo() { console.log('hi') }`,
      'foo',
    );
    assert.strictEqual(types.length, 0);
  });

  it('returns type from concise arrow body', () => {
    const { node, checker } = getFunctionFromCode(
      `const foo = () => 'hello'`,
      'foo',
    );
    assert.ok(ts.isArrowFunction(node));
    assert.ok(!ts.isBlock(node.body));
    const type = checker.getTypeAtLocation(node.body);
    assert.ok(type.flags & ts.TypeFlags.StringLiteral);
  });

  it('does not traverse into nested function declaration', () => {
    const types = getInferredTypes(
      `function outer() {
        function inner() { return 'nested' }
        return 'outer'
      }`,
      'outer',
    );
    assert.strictEqual(types.length, 1);
    assert.strictEqual((types[0] as ts.StringLiteralType).value, 'outer');
  });

  it('does not traverse into nested function expression', () => {
    const types = getInferredTypes(
      `function outer() {
        const inner = function() { return 'nested' }
        return 'outer'
      }`,
      'outer',
    );
    assert.strictEqual(types.length, 1);
    assert.strictEqual((types[0] as ts.StringLiteralType).value, 'outer');
  });

  it('does not traverse into nested arrow function', () => {
    const types = getInferredTypes(
      `function outer() {
        const inner = () => 'nested'
        return 'outer'
      }`,
      'outer',
    );
    assert.strictEqual(types.length, 1);
    assert.strictEqual((types[0] as ts.StringLiteralType).value, 'outer');
  });

  it('does not traverse into nested class method', () => {
    const types = getInferredTypes(
      `function outer() {
        class Foo {
          bar() { return 'nested' }
        }
        return 'outer'
      }`,
      'outer',
    );
    assert.strictEqual(types.length, 1);
    assert.strictEqual((types[0] as ts.StringLiteralType).value, 'outer');
  });

  it('does not traverse into nested getter', () => {
    const types = getInferredTypes(
      `function outer() {
        class Foo {
          get value() { return 'nested' }
        }
        return 'outer'
      }`,
      'outer',
    );
    assert.strictEqual(types.length, 1);
    assert.strictEqual((types[0] as ts.StringLiteralType).value, 'outer');
  });

  it('does not traverse into nested setter', () => {
    const types = getInferredTypes(
      `function outer() {
        class Foo {
          set value(v: string) { }
        }
        return 'outer'
      }`,
      'outer',
    );
    assert.strictEqual(types.length, 1);
    assert.strictEqual((types[0] as ts.StringLiteralType).value, 'outer');
  });
});
