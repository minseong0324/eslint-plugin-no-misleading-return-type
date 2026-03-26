import ts from 'typescript';

/**
 * Returns true if the type is an intentional "escape hatch" that should not
 * be compared against the inferred return type.
 *
 * Note: `undefined` and `null` are intentionally NOT escape hatches.
 * They are concrete types with semantic meaning — if a function is annotated
 * as returning `undefined` or `null`, we should still verify that the
 * implementation matches. Only truly opaque types (any, unknown, never, void)
 * are escape hatches.
 */
export function isEscapeHatch(type: ts.Type) {
  return !!(
    type.flags &
    (ts.TypeFlags.Any |
      ts.TypeFlags.Unknown |
      ts.TypeFlags.Never |
      ts.TypeFlags.Void)
  );
}
