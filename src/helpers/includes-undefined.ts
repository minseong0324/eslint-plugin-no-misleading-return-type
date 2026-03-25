import ts from 'typescript';

export function includesUndefined(type: ts.Type): boolean {
  if (type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) {
    return true;
  }
  if (type.isUnion()) {
    return type.types.some(includesUndefined);
  }
  if (type.isIntersection()) {
    return type.types.some(includesUndefined);
  }
  return false;
}
