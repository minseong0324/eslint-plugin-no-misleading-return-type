import ts from 'typescript';

export function includesUndefined(type: ts.Type) {
  if (type.flags & ts.TypeFlags.Undefined) {
    return true;
  }
  if (type.isUnion()) {
    return type.types.some((t) => !!(t.flags & ts.TypeFlags.Undefined));
  }
  return false;
}
