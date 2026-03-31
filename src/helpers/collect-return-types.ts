import ts from 'typescript';
import { isFunctionLike } from './is-function-like.js';

type ReturnInfo = { type: ts.Type; expression: ts.Expression };

/**
 * Gets the type of a return expression, recovering type parameters when
 * TypeScript's contextual typing resolves them to their constraints.
 *
 * When a function has an explicit return type annotation (e.g., `: string`),
 * `getTypeAtLocation(x)` for a parameter `x: T extends "a" | "b"` may return
 * the resolved constraint `"a" | "b"` instead of the type parameter `T`.
 * This function detects that case and returns the declared type parameter,
 * matching what TypeScript would infer without the annotation.
 */
export function getExpressionType(
  checker: ts.TypeChecker,
  expr: ts.Expression,
): ts.Type {
  const type = checker.getTypeAtLocation(expr);
  // Recover type parameter: if the expression is a simple identifier whose
  // declared type is a type parameter, prefer that over the contextually-resolved type.
  if (ts.isIdentifier(expr) && !(type.flags & ts.TypeFlags.TypeParameter)) {
    const symbol = checker.getSymbolAtLocation(expr);
    if (symbol) {
      const declaredType = checker.getTypeOfSymbol(symbol);
      if (declaredType.flags & ts.TypeFlags.TypeParameter) {
        return declaredType;
      }
    }
  }
  return type;
}

/**
 * Collects all return statements with expressions from a function body,
 * returning both the inferred type and the AST expression for each.
 * Skips bare `return;` statements (no expression) and nested function-like nodes.
 */
export function collectReturns(
  checker: ts.TypeChecker,
  node: ts.Node,
): ReturnInfo[] {
  const results: ReturnInfo[] = [];
  function visit(child: ts.Node): void {
    if (isFunctionLike(child)) return;
    if (ts.isReturnStatement(child) && child.expression) {
      results.push({
        type: getExpressionType(checker, child.expression),
        expression: child.expression,
      });
      return;
    }
    ts.forEachChild(child, visit);
  }
  visit(node);
  return results;
}
