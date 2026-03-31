import ts from 'typescript';
import { isFunctionLike } from './is-function-like.js';

type ReturnInfo = { type: ts.Type; expression: ts.Expression };

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
        type: checker.getTypeAtLocation(child.expression),
        expression: child.expression,
      });
      return;
    }
    ts.forEachChild(child, visit);
  }
  visit(node);
  return results;
}
