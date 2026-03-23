import ts from 'typescript';

export function isEscapeHatch(type: ts.Type) {
  return !!(
    type.flags &
    (ts.TypeFlags.Any |
      ts.TypeFlags.Unknown |
      ts.TypeFlags.Never |
      ts.TypeFlags.Void)
  );
}
