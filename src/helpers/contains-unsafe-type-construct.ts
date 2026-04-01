import ts from 'typescript';

/**
 * Checks if a type contains complex type constructs that make
 * isTypeAssignableTo unreliable for generic function comparison.
 * Conditional types, mapped types, index types, and indexed access
 * types involve deferred type resolution that can produce incorrect results.
 */
export function containsUnsafeTypeConstruct(
  checker: ts.TypeChecker,
  type: ts.Type,
  visited = new Set<ts.Type>(),
): boolean {
  if (visited.has(type)) {
    return false;
  }
  visited.add(type);

  if (type.flags & ts.TypeFlags.Conditional) {
    return true;
  }
  if (type.flags & ts.TypeFlags.Substitution) {
    return true;
  }
  if (type.flags & ts.TypeFlags.Index) {
    return true;
  }
  if (type.flags & ts.TypeFlags.IndexedAccess) {
    return true;
  }

  if (
    type.flags & ts.TypeFlags.Object &&
    (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Mapped
  ) {
    return true;
  }

  if (type.isUnion() || type.isIntersection()) {
    return type.types.some((t) =>
      containsUnsafeTypeConstruct(checker, t, visited),
    );
  }

  if (
    type.flags & ts.TypeFlags.Object &&
    (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference
  ) {
    const typeArgs = checker.getTypeArguments(type as ts.TypeReference);
    if (
      typeArgs.some((t) => containsUnsafeTypeConstruct(checker, t, visited))
    ) {
      return true;
    }
  }

  if (type.flags & ts.TypeFlags.Object) {
    for (const prop of type.getProperties()) {
      if (
        containsUnsafeTypeConstruct(
          checker,
          checker.getTypeOfSymbol(prop),
          visited,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}
