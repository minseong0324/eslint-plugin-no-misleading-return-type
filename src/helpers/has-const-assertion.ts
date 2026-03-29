import ts from 'typescript';

export function hasConstAssertion(expr: ts.Expression): boolean {
  // Unwrap parentheses: return ("idle" as const)
  if (ts.isParenthesizedExpression(expr)) {
    return hasConstAssertion(expr.expression);
  }
  // as const
  if (ts.isAsExpression(expr)) {
    if (
      ts.isTypeReferenceNode(expr.type) &&
      ts.isIdentifier(expr.type.typeName) &&
      expr.type.typeName.text === 'const'
    ) {
      return true;
    }
  }
  // <const>expr (angle bracket — .ts only)
  if (expr.kind === ts.SyntaxKind.TypeAssertionExpression) {
    const assertion = expr as ts.TypeAssertion;
    if (
      ts.isTypeReferenceNode(assertion.type) &&
      ts.isIdentifier(assertion.type.typeName) &&
      assertion.type.typeName.text === 'const'
    ) {
      return true;
    }
  }
  return false;
}
