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
  if (type.flags & ts.TypeFlags.Object) {
    const objType = type as ts.ObjectType;
    // For generic instantiations (Reference types), getBaseTypes throws on the
    // instantiated type, so we must call it on refType.target (the uninstantiated
    // declaration). The uninstantiated base types use type parameters (e.g., Promise<B>),
    // so we map the parameter position back to the instantiated type arguments.
    if (objType.objectFlags & ts.ObjectFlags.Reference) {
      const refType = type as ts.TypeReference;
      if (refType.target && refType.target !== type) {
        try {
          const targetBaseTypes = checker.getBaseTypes(
            refType.target as ts.InterfaceType,
          );
          for (const base of targetBaseTypes) {
            if (base.symbol && PROMISE_NAMES.has(base.symbol.name)) {
              // Find which type parameter position maps to Promise's inner type.
              // e.g., interface Foo<A, B> extends Promise<B> → B is at index 1
              const baseTypeArgs = checker.getTypeArguments(
                base as ts.TypeReference,
              );
              const promiseInner = baseTypeArgs?.[0];
              if (
                promiseInner &&
                promiseInner.flags & ts.TypeFlags.TypeParameter
              ) {
                const targetParams = (refType.target as ts.InterfaceType)
                  .typeParameters;
                if (targetParams) {
                  const paramIndex = targetParams.findIndex(
                    (p) => p === promiseInner,
                  );
                  if (paramIndex >= 0) {
                    const instantiatedArgs = checker.getTypeArguments(refType);
                    return instantiatedArgs?.[paramIndex];
                  }
                }
              }
              // Fallback: Promise arg is concrete (not a type parameter)
              // e.g., interface Foo<X> extends Promise<string> → return string
              return promiseInner;
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
