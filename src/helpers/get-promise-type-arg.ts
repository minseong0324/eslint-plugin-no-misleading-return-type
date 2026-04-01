import ts from 'typescript';

const PROMISE_NAMES = new Set(['Promise', 'PromiseLike']);

/**
 * Extracts the inner type T from Promise<T>, PromiseLike<T>, or types extending them.
 * Returns undefined if the type is not Promise-like.
 */
export function getPromiseTypeArg(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | undefined {
  // Direct: Promise<T> or PromiseLike<T>
  if (type.symbol && PROMISE_NAMES.has(type.symbol.name)) {
    const typeArgs = checker.getTypeArguments(type as ts.TypeReference);
    return typeArgs?.[0];
  }
  // Interface/class extending Promise (e.g., interface ApiResponse<T> extends Promise<T>)
  // For a generic instantiation like ApiResponse<string>, getBaseTypes returns
  // uninstantiated base types (Promise<T> instead of Promise<string>).
  // We must use the reference type's own type arguments which hold the concrete types.
  if (type.flags & ts.TypeFlags.Object) {
    const objType = type as ts.ObjectType;
    // For generic instantiations (Reference types), check the target's base types
    // and map back through the instantiated type arguments.
    if (objType.objectFlags & ts.ObjectFlags.Reference) {
      const refType = type as ts.TypeReference;
      if (refType.target && refType.target !== type) {
        try {
          const targetBaseTypes = checker.getBaseTypes(
            refType.target as ts.InterfaceType,
          );
          for (const base of targetBaseTypes) {
            if (base.symbol && PROMISE_NAMES.has(base.symbol.name)) {
              // The target's base is Promise<T> (uninstantiated).
              // The refType's typeArguments hold the instantiated params,
              // so typeArgs[0] is the concrete type (e.g., string).
              const typeArgs = checker.getTypeArguments(refType);
              return typeArgs?.[0];
            }
          }
        } catch {
          // Not an interface type — ignore
        }
      }
    } else {
      // Non-reference object types (direct interface/class declarations)
      try {
        const baseTypes = checker.getBaseTypes(type as ts.InterfaceType);
        for (const base of baseTypes) {
          const arg = getPromiseTypeArg(checker, base);
          if (arg) {
            return arg;
          }
        }
      } catch {
        // Not an interface type — ignore
      }
    }
  }
  return undefined;
}
