import ts from 'typescript';
import { hasConstAssertion } from './has-const-assertion.js';

/**
 * Checks if an expression effectively has `as const`, including
 * cases where a variable was initialized with `as const`.
 * e.g., `const x = { A: "x" } as const; return x;`
 */
export function hasEffectiveConstAssertion(
  checker: ts.TypeChecker,
  expr: ts.Expression,
): boolean {
  if (hasConstAssertion(expr)) {
    return true;
  }

  // Follow variable references: `const x = { ... } as const; return x;`
  if (ts.isIdentifier(expr)) {
    const symbol = checker.getSymbolAtLocation(expr);
    const decl = symbol?.valueDeclaration;
    if (
      decl &&
      ts.isVariableDeclaration(decl) &&
      decl.initializer &&
      ts.isExpression(decl.initializer)
    ) {
      return hasConstAssertion(decl.initializer);
    }
  }
  return false;
}
