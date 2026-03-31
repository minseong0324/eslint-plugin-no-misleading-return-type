import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';
import ts from 'typescript';
import { collectReturns } from '../helpers/collect-return-types.js';
import { containsAny } from '../helpers/contains-any.js';
import { createUnionType } from '../helpers/create-union-type.js';
import { hasConstAssertion } from '../helpers/has-const-assertion.js';
import { includesUndefined } from '../helpers/includes-undefined.js';
import { isEscapeHatch } from '../helpers/is-escape-hatch.js';
import { isExported } from '../helpers/is-exported.js';
import { truncateTypeString } from '../helpers/truncate-type-string.js';
import type { FunctionNode } from '../helpers/types.js';

/**
 * Checks if the difference between two types is solely due to object property
 * literal widening (e.g., `false` → `boolean`, `42` → `number`).
 *
 * Without `as const`, TypeScript widens literal types in object literal properties
 * when inferring return types. However, `checker.getTypeAtLocation()` may return
 * the narrow (pre-widening) type for boolean and numeric literals in object
 * properties. This function detects when the annotated type is only "wider"
 * because of this widening difference, avoiding false positives.
 */
function isOnlyPropertyLiteralWidening(
  checker: ts.TypeChecker,
  wider: ts.Type,
  narrower: ts.Type,
  depth = 0,
): boolean {
  if (depth > 3) return false; // Prevent deep recursion

  // Don't attempt to decompose union annotated types — too complex
  if (wider.isUnion()) return false;

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
    if (wElems.length !== nElems.length) return false;
    if (wElems.length === 0) return false;
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

  if (widerProps.length !== narrowerProps.length) return false;
  if (widerProps.length === 0) return false;

  let hasWidening = false;

  for (const wProp of widerProps) {
    const nProp = narrowerProps.find((p) => p.name === wProp.name);
    if (!nProp) return false;

    // Check optionality matches
    const wOptional = !!(wProp.flags & ts.SymbolFlags.Optional);
    const nOptional = !!(nProp.flags & ts.SymbolFlags.Optional);
    if (wOptional !== nOptional) return false;

    const wType = checker.getTypeOfSymbol(wProp);
    const nType = checker.getTypeOfSymbol(nProp);

    // If already equivalent, this property is fine
    if (
      checker.isTypeAssignableTo(wType, nType) &&
      checker.isTypeAssignableTo(nType, wType)
    ) {
      continue;
    }

    // Try literal widening: getBaseTypeOfLiteralType(false) → boolean
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

function isOverloadImplementation(
  tsFunctionNode: ts.Node,
  checker: ts.TypeChecker,
): boolean {
  if (
    (ts.isFunctionDeclaration(tsFunctionNode) ||
      ts.isMethodDeclaration(tsFunctionNode)) &&
    tsFunctionNode.name
  ) {
    const symbol = checker.getSymbolAtLocation(tsFunctionNode.name);
    if (symbol?.declarations && symbol.declarations.length > 1) {
      return symbol.declarations.some(
        (d) =>
          (ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d)) && !d.body,
      );
    }
  }
  return false;
}

/**
 * Checks if an expression effectively has `as const`, including
 * cases where a variable was initialized with `as const`.
 * e.g., `const x = { A: "x" } as const; return x;`
 */
function hasEffectiveConstAssertion(
  checker: ts.TypeChecker,
  expr: ts.Expression,
): boolean {
  if (hasConstAssertion(expr)) return true;

  // Follow variable references: `const x = { ... } as const; return x;`
  if (ts.isIdentifier(expr)) {
    const symbol = checker.getSymbolAtLocation(expr);
    const decl = symbol?.valueDeclaration;
    if (
      decl &&
      ts.isVariableDeclaration(decl) &&
      decl.initializer &&
      ts.isExpression(decl.initializer)
    ) {
      return hasConstAssertion(decl.initializer);
    }
  }
  return false;
}

/**
 * Checks if a type contains complex type constructs that make
 * isTypeAssignableTo unreliable for generic function comparison.
 * Conditional types, mapped types, index types, and indexed access
 * types involve deferred type resolution that can produce incorrect results.
 */
function containsUnsafeTypeConstruct(
  checker: ts.TypeChecker,
  type: ts.Type,
  visited = new Set<ts.Type>(),
): boolean {
  if (visited.has(type)) return false;
  visited.add(type);

  if (type.flags & ts.TypeFlags.Conditional) return true;
  if (type.flags & ts.TypeFlags.Substitution) return true;
  if (type.flags & ts.TypeFlags.Index) return true;
  if (type.flags & ts.TypeFlags.IndexedAccess) return true;

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

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/blob/main/docs/rules/${name}.md`,
);

type FixOption = 'suggestion' | 'autofix' | 'none';
type Options = [{ fix: FixOption }];

const PROMISE_NAMES = new Set(['Promise', 'PromiseLike']);

/**
 * Extracts the inner type T from Promise<T>, PromiseLike<T>, or types extending them.
 * Returns undefined if the type is not Promise-like.
 */
function getPromiseTypeArg(
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
          if (arg) return arg;
        }
      } catch {
        // Not an interface type — ignore
      }
    }
  }
  return undefined;
}
type MessageIds =
  | 'misleadingReturnType'
  | 'removeReturnType'
  | 'narrowReturnType';

export const noMisleadingReturnType = createRule<Options, MessageIds>({
  name: 'no-misleading-return-type',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detect return type annotations that are misleadingly wider than what your implementation actually returns',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      misleadingReturnType:
        'Return type `{{annotated}}` is wider than inferred `{{inferred}}`, hiding precise types from callers. Remove the annotation or narrow it.',
      removeReturnType: 'Remove return type annotation',
      narrowReturnType: 'Narrow return type to `{{inferred}}`',
    },
    schema: [
      {
        type: 'object',
        properties: {
          fix: {
            type: 'string',
            enum: ['suggestion', 'autofix', 'none'],
            default: 'suggestion',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ fix: 'suggestion' }],
  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();

    // Captured via closure — all checker-dependent logic lives here
    // "inferred" here means the approximated function return type:
    // - Single return: widened via getBaseTypeOfLiteralType (matches TS signature inference)
    // - Multi return: literal union from return expressions (matches TS union inference)
    function isAnnotatedWiderThanInferred(
      annotated: ts.Type,
      inferred: ts.Type,
    ) {
      // isTypeAssignableTo is public API since TypeScript 5.0
      const inferredFitsInAnnotated = checker.isTypeAssignableTo(
        inferred,
        annotated,
      );
      const annotatedFitsInInferred = checker.isTypeAssignableTo(
        annotated,
        inferred,
      );
      // Annotated is wider: inferred fits into annotated, but not vice versa
      // e.g. string (annotated) vs "idle" (inferred): "idle" → string ✓, string → "idle" ✗
      return inferredFitsInAnnotated && !annotatedFitsInInferred;
    }

    function checkFunction(node: FunctionNode) {
      // Phase 1: ESTree-only cheap checks (no type checker calls)
      if (!node.returnType) {
        return;
      }

      if (!node.body) {
        return;
      } // overload signatures, abstract methods, and declare functions all have no body

      if (
        node.parent != null &&
        node.parent.type === 'MethodDefinition' &&
        node.parent.kind === 'set'
      ) {
        return;
      }
      if (
        node.parent != null &&
        node.parent.type === 'MethodDefinition' &&
        node.parent.kind === 'get'
      ) {
        // Skip getter+setter pairs — return type must be consistent with setter parameter
        const classBody = node.parent.parent;
        if (classBody?.type === 'ClassBody') {
          const getterKey = node.parent.key;
          const hasSetter = classBody.body.some(
            (member) =>
              member.type === 'MethodDefinition' &&
              member.kind === 'set' &&
              member.key.type === getterKey.type &&
              ((member.key.type === 'Identifier' &&
                getterKey.type === 'Identifier' &&
                member.key.name === getterKey.name) ||
                (member.key.type === 'Literal' &&
                  getterKey.type === 'Literal' &&
                  member.key.value === getterKey.value)),
          );
          if (hasSetter) return;
        }
      }
      if (
        node.parent?.type === 'MethodDefinition' &&
        node.parent.override === true
      ) {
        // override method — v1 skip
        // Override methods must be compatible with the parent class return type,
        // so flagging them causes false positives the developer cannot fix.
        // TODO(v2): Could check if the override uses a covariant (narrowed) return
        // type and only skip when the annotated type exactly matches the parent.
        return;
      }
      if (node.generator) {
        // generators — v1 skip
        // TODO(v2): Generator return type is Iterator<T, TReturn, TNext>.
        // Unwrapping the yielded/return types is non-trivial. Skipped for v1.
        return;
      }
      // Generic functions: handled after Phase 3 (annotation resolution).
      // If the annotation is concrete (no type parameters), comparison is safe.
      // If the annotation references type parameters (e.g., T, T[]), skip.

      // Phase 2: TS node mapping
      const tsFunctionNode = parserServices.esTreeNodeToTSNodeMap.get(node);

      // Overload implementation — skip (wider return type is intentional)
      if (isOverloadImplementation(tsFunctionNode, checker)) {
        return;
      }

      // Phase 3: annotated type resolution
      const tsReturnTypeNode = parserServices.esTreeNodeToTSNodeMap.get(
        node.returnType.typeAnnotation,
      );
      if (!ts.isTypeNode(tsReturnTypeNode)) {
        return;
      }
      const annotatedType = checker.getTypeFromTypeNode(tsReturnTypeNode);
      if (isEscapeHatch(annotatedType)) {
        return;
      }

      // Generic functions: skip only when annotation contains complex type constructs
      // (conditional, mapped, index, indexed-access) where isTypeAssignableTo is unreliable.
      // Simple type parameter usage (T, T[], T | null, { prop: T }) works correctly
      // with bidirectional assignability — TS handles type parameter identity.
      if (
        node.typeParameters &&
        containsUnsafeTypeConstruct(checker, annotatedType)
      ) {
        return;
      }

      // Phase 4: inferred type resolution
      // For single-return and concise-arrow, apply getBaseTypeOfLiteralType to match
      // TypeScript's return type inference (which widens lone literal returns).
      // Multi-return unions are kept as-is — TS preserves literal unions.
      let inferredType: ts.Type;
      let hasAnyConstReturn = false;
      try {
        if (
          node.type === 'ArrowFunctionExpression' &&
          node.expression === true
        ) {
          // Concise body arrow: the body IS the expression.
          // Widen literal types to match TS return type inference,
          // unless `as const` assertion is present (preserves literals).
          const tsBodyExpr = parserServices.esTreeNodeToTSNodeMap.get(
            node.body as TSESTree.Expression,
          );
          const rawType = checker.getTypeAtLocation(tsBodyExpr);
          const isConst =
            ts.isExpression(tsBodyExpr) &&
            hasEffectiveConstAssertion(checker, tsBodyExpr);
          hasAnyConstReturn = isConst;
          inferredType = isConst
            ? rawType
            : checker.getBaseTypeOfLiteralType(rawType);
        } else {
          // Block body: traverse return statements
          const tsFuncBody = (
            tsFunctionNode as
              | ts.FunctionDeclaration
              | ts.FunctionExpression
              | ts.ArrowFunction
              | ts.MethodDeclaration
          ).body;
          if (!tsFuncBody || !ts.isBlock(tsFuncBody)) {
            return;
          }

          const returns = collectReturns(checker, tsFuncBody);

          if (returns.length === 0) {
            return;
          } // void function — nothing to compare

          if (returns.length === 1) {
            const { type: singleType, expression: returnExpr } = returns[0];
            const isConst = hasEffectiveConstAssertion(checker, returnExpr);
            hasAnyConstReturn = isConst;
            inferredType =
              singleType.isUnion() || isConst
                ? singleType
                : checker.getBaseTypeOfLiteralType(singleType);
          } else {
            const union = createUnionType(
              checker,
              returns.map((r) => r.type),
            );
            if (!union) {
              return;
            }
            inferredType = union;
            hasAnyConstReturn = returns.some((r) =>
              hasEffectiveConstAssertion(checker, r.expression),
            );
          }
        }
      } catch (_e) {
        // Intentional broad catch: TypeScript's type resolution throws on recursive /
        // mutually-recursive functions (circular type dependency). Any other exception
        // here also results in a missed diagnostic rather than a crash.
        return;
      }

      if (containsAny(checker, inferredType)) {
        return;
      } // any-contaminated inference is unreliable

      // Phase 5: comparison
      // effectiveInferred is the type to compare against annotated.
      // For async functions this may be unwrapped from Promise<T>.
      let effectiveInferred = inferredType;
      let effectiveAnnotated: ts.Type;

      if (node.async) {
        // async functions: unwrap Promise<T> / PromiseLike<T> or types extending them
        const annotatedInner = getPromiseTypeArg(checker, annotatedType);
        if (!annotatedInner) {
          return;
        }
        if (isEscapeHatch(annotatedInner)) {
          return;
        } // Promise<void>, Promise<any>, etc.

        // Also unwrap inferred type if it's Promise<T> or PromiseLike<T>
        // (e.g., return someAsyncFn()). In async functions, returning a thenable
        // resolves to T, so compare inner types.
        const inferredInner = getPromiseTypeArg(checker, inferredType);
        if (inferredInner) {
          effectiveInferred = inferredInner;
        }

        effectiveAnnotated = annotatedInner;
      } else {
        effectiveAnnotated = annotatedType;
      }

      if (
        includesUndefined(effectiveAnnotated) &&
        !includesUndefined(effectiveInferred)
      ) {
        return; // implicit undefined path heuristic
      }
      if (
        !isAnnotatedWiderThanInferred(effectiveAnnotated, effectiveInferred)
      ) {
        return;
      }
      // Skip union redundancy: T | string where T extends string → semantically just string.
      // TypeScript doesn't collapse these unions, so isTypeAssignableTo sees them as wider,
      // but the extra member is already a supertype of T's constraint — not misleading.
      if (effectiveAnnotated.isUnion() && node.typeParameters) {
        const typeParamMembers = effectiveAnnotated.types.filter(
          (t) => t.flags & ts.TypeFlags.TypeParameter,
        );
        if (typeParamMembers.length > 0) {
          const allSubsumed = typeParamMembers.every((tp) => {
            const constraint = checker.getBaseConstraintOfType(tp);
            if (!constraint) return false;
            return effectiveAnnotated.types.some(
              (other) =>
                other !== tp && checker.isTypeAssignableTo(constraint, other),
            );
          });
          if (allSubsumed) return;
        }
      }

      // Skip false positives from object literal property widening (e.g., false → boolean)
      // without as const. TypeScript widens these in return type inference.
      if (
        !hasAnyConstReturn &&
        isOnlyPropertyLiteralWidening(
          checker,
          effectiveAnnotated,
          effectiveInferred,
        )
      ) {
        return;
      }

      // Build the inferred type string for the message.
      // For async functions, re-wrap effectiveInferred using the original wrapper name
      // (Promise or PromiseLike) to preserve the user's intent.
      const inferredTypeString = node.async
        ? `${annotatedType.symbol?.name ?? 'Promise'}<${checker.typeToString(
            effectiveInferred,
          )}>`
        : checker.typeToString(effectiveInferred);

      const fixOption = context.options[0]?.fix ?? 'suggestion';
      // Check if removing this return type could break isolatedDeclarations.
      const fnIsExported = isExported(
        node,
        tsFunctionNode,
        checker,
        parserServices,
      );
      // autofix on exported functions could break isolatedDeclarations — fall back to suggestion
      const effectiveFix =
        fixOption === 'autofix' && fnIsExported ? 'suggestion' : fixOption;

      const reportData = {
        annotated: truncateTypeString(checker.typeToString(annotatedType)),
        inferred: truncateTypeString(inferredTypeString),
      };

      // typeToString can produce unparseable strings (e.g. "..." truncation,
      // internal names like "__type", or "typeof import(...)"). Skip narrow
      // suggestion when the type string is unlikely to be valid TS syntax.
      const isSafeTypeString = !/\.{3}(?!\.)|^__\w+|typeof import\(/.test(
        inferredTypeString,
      );

      if (effectiveFix === 'autofix') {
        return context.report({
          node: node.returnType,
          messageId: 'misleadingReturnType',
          data: reportData,
          fix: (fixer) => fixer.remove(node.returnType!),
        });
      }

      if (effectiveFix !== 'suggestion') {
        return context.report({
          node: node.returnType,
          messageId: 'misleadingReturnType',
          data: reportData,
        });
      }

      const suggestions: {
        messageId: MessageIds;
        data?: Record<string, string>;
        fix: (fixer: TSESLint.RuleFixer) => TSESLint.RuleFix;
      }[] = [];
      // Removing the return type on exported functions could break
      // isolatedDeclarations — only offer narrow suggestion for those.
      if (!fnIsExported) {
        suggestions.push({
          messageId: 'removeReturnType',
          fix: (fixer: TSESLint.RuleFixer) => fixer.remove(node.returnType!),
        });
      }
      if (isSafeTypeString) {
        suggestions.push({
          messageId: 'narrowReturnType',
          data: reportData,
          fix: (fixer: TSESLint.RuleFixer) =>
            fixer.replaceText(node.returnType!, `: ${inferredTypeString}`),
        });
      }

      // If no suggestions are available (exported + unsafe type string),
      // fall back to report-only.
      if (suggestions.length === 0) {
        return context.report({
          node: node.returnType,
          messageId: 'misleadingReturnType',
          data: reportData,
        });
      }

      context.report({
        node: node.returnType,
        messageId: 'misleadingReturnType',
        data: reportData,
        suggest: suggestions,
      });
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
});
