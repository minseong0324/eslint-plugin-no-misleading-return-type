import ts from 'typescript';

/**
 * Checks if the difference between two types is solely due to object property
 * literal widening (e.g., `false` -> `boolean`, `42` -> `number`).
 *
 * Without `as const`, TypeScript widens literal types in object literal properties
 * when inferring return types. However, `checker.getTypeAtLocation()` may return
 * the narrow (pre-widening) type for boolean and numeric literals in object
 * properties. This function detects when the annotated type is only "wider"
 * because of this widening difference, avoiding false positives.
 */
export function isOnlyPropertyLiteralWidening(
  checker: ts.TypeChecker,
  wider: ts.Type,
  narrower: ts.Type,
  depth = 0,
): boolean {
  if (depth > 3) {
    return false; // Prevent deep recursion
  }

  // Don't attempt to decompose union annotated types — too complex
  if (wider.isUnion()) {
    return false;
  }

  // Handle union inferred types — each member must match
  if (narrower.isUnion()) {
    return narrower.types.every((t) =>
      isOnlyPropertyLiteralWidening(checker, wider, t, depth),
    );
  }

  // Both must be object types
  if (
    !(wider.flags & ts.TypeFlags.Object) ||
    !(narrower.flags & ts.TypeFlags.Object)
  ) {
    return false;
  }

  // For tuple types, compare element types directly via getTypeArguments.
  // This avoids iterating over inherited Array prototype methods whose
  // signatures differ between tuple types (e.g., push, pop, map).
  if (checker.isTupleType(wider) && checker.isTupleType(narrower)) {
    const wElems = checker.getTypeArguments(wider as ts.TypeReference);
    const nElems = checker.getTypeArguments(narrower as ts.TypeReference);
    if (wElems.length !== nElems.length) {
      return false;
    }
    if (wElems.length === 0) {
      return false;
    }
    let hasWidening = false;
    for (let i = 0; i < wElems.length; i++) {
      if (
        checker.isTypeAssignableTo(wElems[i], nElems[i]) &&
        checker.isTypeAssignableTo(nElems[i], wElems[i])
      ) {
        continue;
      }
      const widenedN = checker.getBaseTypeOfLiteralType(nElems[i]);
      if (
        checker.isTypeAssignableTo(wElems[i], widenedN) &&
        checker.isTypeAssignableTo(widenedN, wElems[i])
      ) {
        hasWidening = true;
        continue;
      }
      return false;
    }
    return hasWidening;
  }

  const widerProps = checker.getPropertiesOfType(wider);
  const narrowerProps = checker.getPropertiesOfType(narrower);

  if (widerProps.length !== narrowerProps.length) {
    return false;
  }
  if (widerProps.length === 0) {
    return false;
  }

  let hasWidening = false;

  for (const wProp of widerProps) {
    const nProp = narrowerProps.find((p) => p.name === wProp.name);
    if (!nProp) {
      return false;
    }

    // Check optionality matches
    const wOptional = !!(wProp.flags & ts.SymbolFlags.Optional);
    const nOptional = !!(nProp.flags & ts.SymbolFlags.Optional);
    if (wOptional !== nOptional) {
      return false;
    }

    const wType = checker.getTypeOfSymbol(wProp);
    const nType = checker.getTypeOfSymbol(nProp);

    // If already equivalent, this property is fine
    if (
      checker.isTypeAssignableTo(wType, nType) &&
      checker.isTypeAssignableTo(nType, wType)
    ) {
      continue;
    }

    // Try literal widening: getBaseTypeOfLiteralType(false) -> boolean
    const widenedN = checker.getBaseTypeOfLiteralType(nType);
    if (
      checker.isTypeAssignableTo(wType, widenedN) &&
      checker.isTypeAssignableTo(widenedN, wType)
    ) {
      hasWidening = true;
      continue;
    }

    // Try recursive check for nested object types
    if (isOnlyPropertyLiteralWidening(checker, wType, nType, depth + 1)) {
      hasWidening = true;
      continue;
    }

    return false;
  }

  return hasWidening;
}
