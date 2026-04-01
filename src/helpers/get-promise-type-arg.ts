import type ts from 'typescript';

/**
 * Extracts the inner type T from Promise<T>.
 * Returns undefined if the type is not Promise.
 */
export function getPromiseTypeArg(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | undefined {
  if (type.symbol && type.symbol.name === 'Promise') {
    const typeArgs = checker.getTypeArguments(type as ts.TypeReference);
    return typeArgs?.[0];
  }
  return undefined;
}
