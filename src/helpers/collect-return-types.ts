import ts from 'typescript';
import { isFunctionLike } from './is-function-like.js';

export function collectReturnTypes(
  checker: ts.TypeChecker,
  node: ts.Node,
  types: ts.Type[],
): void {
  // Don't traverse into nested function-like nodes — they have their own return types
  if (isFunctionLike(node)) {
    return;
  }

  if (ts.isReturnStatement(node) && node.expression) {
    types.push(checker.getTypeAtLocation(node.expression));
    return;
  }

  ts.forEachChild(node, (child) => collectReturnTypes(checker, child, types));
}
