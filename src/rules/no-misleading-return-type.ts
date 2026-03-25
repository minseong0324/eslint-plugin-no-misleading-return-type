import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';
import ts from 'typescript';
import { includesUndefined } from '../helpers/includes-undefined.js';
import { isEscapeHatch } from '../helpers/is-escape-hatch.js';
import { isFunctionLike } from '../helpers/is-function-like.js';
import { truncateTypeString } from '../helpers/truncate-type-string.js';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/blob/main/docs/rules/${name}.md`,
);

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

type FixOption = 'suggestion' | 'autofix' | 'none';
type Options = [{ fix: FixOption; ignoreExported: boolean }];
type MessageIds = 'misleadingReturnType' | 'removeReturnType';

export const noMisleadingReturnType = createRule<Options, MessageIds>({
  name: 'no-misleading-return-type',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Detect return type annotations that are wider than TypeScript's inferred return type",
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      misleadingReturnType:
        'Return type `{{annotated}}` is wider than the inferred type `{{inferred}}`. Remove the annotation or narrow it.',
      removeReturnType: 'Remove return type annotation',
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
          ignoreExported: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ fix: 'suggestion', ignoreExported: false }],
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

    function containsAny(type: ts.Type, visited = new Set<ts.Type>()): boolean {
      if (visited.has(type)) {
        return false; // cycle guard for recursive types
      }
      visited.add(type);

      if (type.flags & ts.TypeFlags.Any) {
        return true;
      }

      if (type.isUnion() || type.isIntersection()) {
        return type.types.some((t) => containsAny(t, visited));
      }

      // TypeReference: Promise<T>, Array<T>, Map<K,V>, etc.
      if (
        type.flags & ts.TypeFlags.Object &&
        (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference
      ) {
        return checker
          .getTypeArguments(type as ts.TypeReference)
          .some((t) => containsAny(t, visited));
      }

      // Object properties: { name: any }, { nested: { deep: any } }
      if (type.flags & ts.TypeFlags.Object) {
        for (const prop of type.getProperties()) {
          const propType = checker.getTypeOfSymbol(prop);
          if (containsAny(propType, visited)) {
            return true;
          }
        }
        // Index signatures: { [key: string]: any }
        const stringIndex = type.getStringIndexType();
        if (stringIndex && containsAny(stringIndex, visited)) {
          return true;
        }
        const numberIndex = type.getNumberIndexType();
        if (numberIndex && containsAny(numberIndex, visited)) {
          return true;
        }
      }

      return false;
    }

    function collectReturnTypes(node: ts.Node, types: ts.Type[]) {
      // Don't traverse into nested function-like nodes — they have their own return types
      if (isFunctionLike(node)) {
        return;
      }

      if (ts.isReturnStatement(node) && node.expression) {
        types.push(checker.getTypeAtLocation(node.expression));
        return;
      }

      ts.forEachChild(node, (child) => collectReturnTypes(child, types));
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
        (node.parent.kind === 'get' || node.parent.kind === 'set')
      ) {
        // getter/setter — v1 skip
        // TODO(v2): Getters could be compared if we also inspect the setter's
        // parameter type. Skipped because getter-only return type semantics
        // differ from regular functions (no explicit call-site inference).
        return;
      }
      if (node.generator) {
        // generators — v1 skip
        // TODO(v2): Generator return type is Iterator<T, TReturn, TNext>.
        // Unwrapping the yielded/return types is non-trivial. Skipped for v1.
        return;
      }
      if (node.typeParameters) {
        // generic functions — v1 skip
        // Inference depends on call-site instantiation, not the function body alone.
        // TODO(v2): Could check per call-site with generic instantiation,
        // but the scope is too broad and error-prone for v1.
        return;
      }

      // Phase 2: TS node mapping
      const tsFunctionNode = parserServices.esTreeNodeToTSNodeMap.get(node);

      // Phase 3: annotated type resolution
      const tsReturnTypeNode = parserServices.esTreeNodeToTSNodeMap.get(
        node.returnType.typeAnnotation,
      );
      const annotatedType = checker.getTypeFromTypeNode(
        tsReturnTypeNode as ts.TypeNode,
      );
      if (isEscapeHatch(annotatedType)) {
        return;
      }

      // Phase 4: inferred type resolution
      // For single-return and concise-arrow, apply getBaseTypeOfLiteralType to match
      // TypeScript's return type inference (which widens lone literal returns).
      // Multi-return unions are kept as-is — TS preserves literal unions.
      let inferredType: ts.Type;
      try {
        if (
          node.type === 'ArrowFunctionExpression' &&
          node.expression === true
        ) {
          // Concise body arrow: the body IS the expression.
          // Widen literal types to match TS return type inference.
          const tsBody = parserServices.esTreeNodeToTSNodeMap.get(
            node.body as TSESTree.Expression,
          );
          inferredType = checker.getBaseTypeOfLiteralType(
            checker.getTypeAtLocation(tsBody),
          );
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

          const returnTypes: ts.Type[] = [];
          // Initial call MUST pass the function body, not the function node itself.
          // Passing the function node would trigger isFunctionLike guard → empty array.
          collectReturnTypes(tsFuncBody, returnTypes);

          if (returnTypes.length === 0) {
            return;
          } // void function — nothing to compare

          if (returnTypes.length === 1) {
            // Widen literal: TS widens single literal returns (e.g. "idle" → string)
            inferredType = checker.getBaseTypeOfLiteralType(returnTypes[0]);
          } else {
            // getUnionType is an internal TypeScript API also used by typescript-eslint itself.
            // No public alternative exists for constructing a union from an array of ts.Type objects.
            // Public API only supports union creation via AST/inference, not from runtime type arrays.
            // The typeof guard ensures safe fallback if this API is removed in a future TS version.
            const getUnionType = (checker as any).getUnionType;
            // UnionReduction.Literal = 1 preserves literal types in the resulting union
            // (vs UnionReduction.Subtype = 2, which collapses subtypes into their base types).
            // Fallback to 1 if the enum is renamed or removed in a future TS version.
            const UnionReductionLiteral =
              (ts as any).UnionReduction?.Literal ?? 1;
            if (typeof getUnionType !== 'function') {
              return; // Internal API unavailable — skip safely
            }
            inferredType = getUnionType.call(
              checker,
              returnTypes,
              UnionReductionLiteral,
            );
          }
        }
      } catch {
        // Intentional broad catch: TypeScript's type resolution throws on recursive /
        // mutually-recursive functions (circular type dependency). Any other exception
        // here also results in a missed diagnostic rather than a crash, which is
        // acceptable for v1. Tracked as a known v1 limitation in the docs.
        return;
      }

      if (containsAny(inferredType)) {
        return;
      } // any-contaminated inference is unreliable

      // Phase 5: comparison
      // effectiveInferred is the type to compare against annotated.
      // For async functions this may be unwrapped from Promise<T>.
      let effectiveInferred = inferredType;

      const PROMISE_NAMES = new Set(['Promise', 'PromiseLike']);

      if (node.async) {
        // async functions: unwrap Promise<T> or PromiseLike<T> from annotated side
        if (
          !annotatedType.symbol ||
          !PROMISE_NAMES.has(annotatedType.symbol.name)
        ) {
          return;
        }
        const typeArgs = checker.getTypeArguments(
          annotatedType as ts.TypeReference,
        );
        if (!typeArgs || typeArgs.length === 0) {
          return;
        }

        const annotatedInner = typeArgs[0];
        if (isEscapeHatch(annotatedInner)) {
          return;
        } // Promise<void>, Promise<any>, etc.

        // Also unwrap inferred type if it's Promise<T> (e.g., return someAsyncFn()).
        // In async functions, returning Promise<T> resolves to T, so compare inner types.
        // Without this, annotated inner (string) vs inferred Promise<"ok"> would be incomparable.
        if (
          inferredType.symbol?.name === 'Promise' &&
          inferredType.flags & ts.TypeFlags.Object &&
          (inferredType as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference
        ) {
          const inferredArgs = checker.getTypeArguments(
            inferredType as ts.TypeReference,
          );
          if (inferredArgs && inferredArgs.length > 0) {
            effectiveInferred = inferredArgs[0];
          }
        }

        if (
          includesUndefined(annotatedInner) &&
          !includesUndefined(effectiveInferred)
        ) {
          return; // implicit undefined path heuristic
        }
        if (!isAnnotatedWiderThanInferred(annotatedInner, effectiveInferred)) {
          return;
        }
      } else {
        if (
          includesUndefined(annotatedType) &&
          !includesUndefined(effectiveInferred)
        ) {
          return; // implicit undefined path heuristic
        }
        if (!isAnnotatedWiderThanInferred(annotatedType, effectiveInferred)) {
          return;
        }
      }

      // Build the inferred type string for the message.
      // For async functions, re-wrap effectiveInferred to show Promise<inner>.
      const inferredTypeString = node.async
        ? `Promise<${checker.typeToString(effectiveInferred)}>`
        : checker.typeToString(effectiveInferred);

      const fixOption = context.options[0]?.fix ?? 'suggestion';
      // Check if removing this return type could break isolatedDeclarations.
      // Covers: direct exports, export-via-variable, exported class methods,
      // and indirect exports including `export { foo as bar }` renames.
      const isExported = (() => {
        // Helper: check if a local symbol appears in the file's export map.
        // Must iterate values (not keys) because `export { foo as bar }` stores
        // the exported name ("bar") as key, not the local name ("foo").
        const isSymbolExported = (nameNode: ts.Node): boolean => {
          const nameSymbol = checker.getSymbolAtLocation(nameNode);
          if (!nameSymbol) {
            return false;
          }
          const fileSymbol = checker.getSymbolAtLocation(
            nameNode.getSourceFile(),
          );
          if (!fileSymbol?.exports) {
            return false;
          }
          for (const exportedSymbol of fileSymbol.exports.values()) {
            if (exportedSymbol === nameSymbol) {
              return true;
            }
            if (exportedSymbol.flags & ts.SymbolFlags.Alias) {
              const resolved = checker.getAliasedSymbol(exportedSymbol);
              if (resolved === nameSymbol) {
                return true;
              }
            }
          }
          return false;
        };

        // === Direct export: owner's parent is Export*Declaration ===

        // Case A: export function foo() / export default function()
        if (
          node.parent?.type === 'ExportNamedDeclaration' ||
          node.parent?.type === 'ExportDefaultDeclaration'
        ) {
          return true;
        }

        // Case B: export const foo = function/arrow
        // FE/Arrow → VariableDeclarator → VariableDeclaration → Export*Declaration
        if (
          (node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression') &&
          node.parent?.type === 'VariableDeclarator' &&
          node.parent.parent?.type === 'VariableDeclaration' &&
          (node.parent.parent.parent?.type === 'ExportNamedDeclaration' ||
            node.parent.parent.parent?.type === 'ExportDefaultDeclaration')
        ) {
          return true;
        }

        // Case C: export class Foo { method() {} } / export default class { method() {} }
        // FE → MethodDefinition → ClassBody → ClassDecl/Expr → Export*Declaration
        if (node.parent?.type === 'MethodDefinition') {
          const classNode = node.parent.parent?.parent;
          if (classNode) {
            if (
              classNode.parent?.type === 'ExportNamedDeclaration' ||
              classNode.parent?.type === 'ExportDefaultDeclaration'
            ) {
              return true;
            }
            // export const Foo = class { ... }
            if (
              classNode.type === 'ClassExpression' &&
              classNode.parent?.type === 'VariableDeclarator' &&
              classNode.parent.parent?.type === 'VariableDeclaration' &&
              (classNode.parent.parent.parent?.type ===
                'ExportNamedDeclaration' ||
                classNode.parent.parent.parent?.type ===
                  'ExportDefaultDeclaration')
            ) {
              return true;
            }
          }
        }

        // === Indirect export: symbol in file's exports map ===

        // Case D: function foo() {} ... export { foo }
        if (ts.isFunctionDeclaration(tsFunctionNode) && tsFunctionNode.name) {
          return isSymbolExported(tsFunctionNode.name);
        }

        // Case E: const foo = () => {} ... export { foo }
        if (
          (node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression') &&
          node.parent?.type === 'VariableDeclarator'
        ) {
          const tsVarDecl = parserServices.esTreeNodeToTSNodeMap.get(
            node.parent,
          );
          if (
            ts.isVariableDeclaration(tsVarDecl) &&
            ts.isIdentifier(tsVarDecl.name)
          ) {
            return isSymbolExported(tsVarDecl.name);
          }
        }

        // Case F: class method in indirectly exported class
        if (node.parent?.type === 'MethodDefinition') {
          const classNode = node.parent.parent?.parent;
          if (classNode) {
            // ClassDeclaration: class Foo {} export { Foo }
            if (classNode.type === 'ClassDeclaration' && classNode.id) {
              const tsClassNode =
                parserServices.esTreeNodeToTSNodeMap.get(classNode);
              if (ts.isClassDeclaration(tsClassNode) && tsClassNode.name) {
                return isSymbolExported(tsClassNode.name);
              }
            }
            // ClassExpression: const Foo = class {} ... export { Foo }
            if (
              classNode.type === 'ClassExpression' &&
              classNode.parent?.type === 'VariableDeclarator'
            ) {
              const tsVarDecl = parserServices.esTreeNodeToTSNodeMap.get(
                classNode.parent,
              );
              if (
                ts.isVariableDeclaration(tsVarDecl) &&
                ts.isIdentifier(tsVarDecl.name)
              ) {
                return isSymbolExported(tsVarDecl.name);
              }
            }
          }
        }

        return false;
      })();
      const ignoreExported = context.options[0]?.ignoreExported ?? false;
      if (ignoreExported && isExported) {
        return;
      }

      // autofix on exported functions could break isolatedDeclarations — fall back to suggestion
      const effectiveFix =
        fixOption === 'autofix' && isExported ? 'suggestion' : fixOption;

      const reportData = {
        annotated: truncateTypeString(checker.typeToString(annotatedType)),
        inferred: truncateTypeString(inferredTypeString),
      };

      if (effectiveFix === 'autofix') {
        context.report({
          node: node.returnType,
          messageId: 'misleadingReturnType',
          data: reportData,
          fix: (fixer) => fixer.remove(node.returnType!),
        });
      } else if (effectiveFix === 'suggestion') {
        context.report({
          node: node.returnType,
          messageId: 'misleadingReturnType',
          data: reportData,
          suggest: [
            {
              messageId: 'removeReturnType',
              fix: (fixer) => fixer.remove(node.returnType!),
            },
          ],
        });
      } else {
        context.report({
          node: node.returnType,
          messageId: 'misleadingReturnType',
          data: reportData,
        });
      }
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
});
