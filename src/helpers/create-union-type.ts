import ts from 'typescript';

/**
 * Creates a union type from an array of types using TypeScript's internal API.
 * getUnionType is an internal TypeScript API also used by typescript-eslint itself.
 * No public alternative exists for constructing a union from an array of ts.Type objects.
 * Returns undefined if the internal API is unavailable.
 */
export function createUnionType(
  checker: ts.TypeChecker,
  types: ts.Type[],
): ts.Type | undefined {
  // getUnionType is internal but widely used; typeof guard ensures safe fallback
  const getUnionType = (checker as any).getUnionType;
  // UnionReduction.Literal = 1 preserves literal types in the resulting union
  // (vs UnionReduction.Subtype = 2, which collapses subtypes into their base types).
  const UnionReductionLiteral = (ts as any).UnionReduction?.Literal ?? 1;
  if (typeof getUnionType !== 'function') {
    return undefined;
  }
  return getUnionType.call(checker, types, UnionReductionLiteral);
}
