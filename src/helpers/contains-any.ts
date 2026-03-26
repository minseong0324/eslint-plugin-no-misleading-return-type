import ts from 'typescript';

export function containsAny(
  checker: ts.TypeChecker,
  type: ts.Type,
  visited = new Set<ts.Type>(),
): boolean {
  if (visited.has(type)) {
    return false; // cycle guard for recursive types
  }
  visited.add(type);

  if (type.flags & ts.TypeFlags.Any) {
    return true;
  }

  if (type.isUnion() || type.isIntersection()) {
    return type.types.some((t) => containsAny(checker, t, visited));
  }

  // TypeReference: Promise<T>, Array<T>, Map<K,V>, etc.
  if (
    type.flags & ts.TypeFlags.Object &&
    (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference
  ) {
    return checker
      .getTypeArguments(type as ts.TypeReference)
      .some((t) => containsAny(checker, t, visited));
  }

  // Object properties: { name: any }, { nested: { deep: any } }
  if (type.flags & ts.TypeFlags.Object) {
    for (const prop of type.getProperties()) {
      const propType = checker.getTypeOfSymbol(prop);
      if (containsAny(checker, propType, visited)) {
        return true;
      }
    }
    // Index signatures: { [key: string]: any }
    const stringIndex = type.getStringIndexType();
    if (stringIndex && containsAny(checker, stringIndex, visited)) {
      return true;
    }
    const numberIndex = type.getNumberIndexType();
    if (numberIndex && containsAny(checker, numberIndex, visited)) {
      return true;
    }
  }

  return false;
}
