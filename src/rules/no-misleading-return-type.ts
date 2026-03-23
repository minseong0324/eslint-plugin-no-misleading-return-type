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

export const noMisleadingReturnType = createRule({
  name: 'no-misleading-return-type',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detect return type annotations that are less precise than the inferred type',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      misleadingReturnType:
        'Return type `{{annotated}}` is less precise than the inferred type `{{inferred}}`. Remove the annotation or narrow it.',
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
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ fix: 'suggestion' as 'suggestion' | 'autofix' | 'none' }],
  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();

    // Captured via closure — all checker-dependent logic lives here
    function isAnnotatedWiderThanInferred(
      annotated: ts.Type,
      inferred: ts.Type,
    ) {
      // isTypeAssignableTo is public API since TypeScript 5.x
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

    function containsAny(type: ts.Type): boolean {
      if (type.flags & ts.TypeFlags.Any) {
        return true;
      }

      if (type.isUnion()) {
        return type.types.some(containsAny);
      }

      if (type.isIntersection()) {
        return type.types.some(containsAny);
      }

      // Guard: only call getTypeArguments on actual TypeReference types (e.g. Promise<T>, Array<T>)
      // Non-Reference ObjectTypes (plain objects, interfaces without type args) would crash without this guard
      if (
        type.flags & ts.TypeFlags.Object &&
        (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference
      ) {
        return checker
          .getTypeArguments(type as ts.TypeReference)
          .some(containsAny);
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
        return; // getter/setter — v1 skip
      }
      if (node.type !== 'ArrowFunctionExpression' && node.generator) {
        return; // generators — v1 skip
      }
      if (node.typeParameters) {
        return; // generic functions — inference depends on call-site
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
      let inferredType: ts.Type;
      try {
        if (
          node.type === 'ArrowFunctionExpression' &&
          node.expression === true
        ) {
          // Concise body arrow: the body IS the expression
          const tsBody = parserServices.esTreeNodeToTSNodeMap.get(
            node.body as TSESTree.Expression,
          );
          inferredType = checker.getTypeAtLocation(tsBody);
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
            inferredType = returnTypes[0];
          } else {
            // getUnionType is an internal TypeScript API used by typescript-eslint itself.
            // No public alternative exists for constructing a union from an array of types.
            // Guard against removal in future TS versions.
            const getUnionType = (checker as any).getUnionType;
            const UnionReductionLiteral =
              (ts as any).UnionReduction?.Literal ?? 2;
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
        // Recursive functions can cause circular type resolution
        return;
      }

      if (containsAny(inferredType)) {
        return;
      } // any-contaminated inference is unreliable

      // Phase 5: comparison
      if (node.async) {
        // async functions: unwrap Promise<T> from both sides before comparing
        if (!annotatedType.symbol || annotatedType.symbol.name !== 'Promise') {
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
        // inferredType is already the unwrapped value from return statement traversal
        if (
          includesUndefined(annotatedInner) &&
          !includesUndefined(inferredType)
        ) {
          return; // implicit undefined path heuristic
        }
        if (!isAnnotatedWiderThanInferred(annotatedInner, inferredType)) {
          return;
        }
      } else {
        if (
          includesUndefined(annotatedType) &&
          !includesUndefined(inferredType)
        ) {
          return; // implicit undefined path heuristic
        }
        if (!isAnnotatedWiderThanInferred(annotatedType, inferredType)) {
          return;
        }
      }

      // Build the inferred type string for the message
      // For async functions, re-wrap the unwrapped inferred type to match annotated side
      const inferredTypeString = node.async
        ? `Promise<${checker.typeToString(inferredType)}>`
        : checker.typeToString(inferredType);

      const fixOption = context.options[0]?.fix ?? 'suggestion';
      // Check both inline export and indirect `export { foo }` patterns
      const isExported = (() => {
        if (
          node.parent?.type === 'ExportNamedDeclaration' ||
          node.parent?.type === 'ExportDefaultDeclaration'
        ) {
          return true;
        }
        // Indirect export: function foo() {} ... export { foo }
        if (ts.isFunctionDeclaration(tsFunctionNode) && tsFunctionNode.name) {
          const nameSymbol = checker.getSymbolAtLocation(tsFunctionNode.name);
          if (nameSymbol) {
            const fileSymbol = checker.getSymbolAtLocation(
              tsFunctionNode.getSourceFile(),
            );
            if (fileSymbol?.exports?.has(nameSymbol.escapedName)) {
              return true;
            }
          }
        }
        return false;
      })();
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
