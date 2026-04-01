import ts from 'typescript';

export function isOverloadImplementation(
  tsFunctionNode: ts.Node,
  checker: ts.TypeChecker,
): boolean {
  if (
    (ts.isFunctionDeclaration(tsFunctionNode) ||
      ts.isMethodDeclaration(tsFunctionNode)) &&
    tsFunctionNode.name
  ) {
    const symbol = checker.getSymbolAtLocation(tsFunctionNode.name);
    if (symbol?.declarations && symbol.declarations.length > 1) {
      return symbol.declarations.some(
        (d) =>
          (ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d)) && !d.body,
      );
    }
  }
  return false;
}
