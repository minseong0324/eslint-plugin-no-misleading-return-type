import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';
import ts from 'typescript';
import { collectReturnTypes } from '../helpers/collect-return-types.js';
import { containsAny } from '../helpers/contains-any.js';
import { createUnionType } from '../helpers/create-union-type.js';
import { includesUndefined } from '../helpers/includes-undefined.js';
import { isEscapeHatch } from '../helpers/is-escape-hatch.js';
import { isExported } from '../helpers/is-exported.js';
import { truncateTypeString } from '../helpers/truncate-type-string.js';
import type { FunctionNode } from '../helpers/types.js';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/blob/main/docs/rules/${name}.md`,
);

type FixOption = 'suggestion' | 'autofix' | 'none';
type Options = [{ fix: FixOption }];

const PROMISE_NAMES = new Set(['Promise', 'PromiseLike']);
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
        'Return type `{{annotated}}` is wider than the inferred type `{{inferred}}`. Remove the annotation or narrow it.',
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
      if (!ts.isTypeNode(tsReturnTypeNode)) {
        return;
      }
      const annotatedType = checker.getTypeFromTypeNode(tsReturnTypeNode);
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
          // Widen literal types to match TS return type inference,
          // unless `as const` assertion is present (preserves literals).
          const tsBody = parserServices.esTreeNodeToTSNodeMap.get(
            node.body as TSESTree.Expression,
          );
          const rawType = checker.getTypeAtLocation(tsBody);
          const bodyExpr = node.body as TSESTree.Expression;
          const isConstAssertion =
            bodyExpr.type === 'TSAsExpression' &&
            bodyExpr.typeAnnotation.type === 'TSTypeReference' &&
            bodyExpr.typeAnnotation.typeName.type === 'Identifier' &&
            bodyExpr.typeAnnotation.typeName.name === 'const';
          inferredType = isConstAssertion
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

          const returnTypes: ts.Type[] = [];
          // Initial call MUST pass the function body, not the function node itself.
          // Passing the function node would trigger isFunctionLike guard → empty array.
          collectReturnTypes(checker, tsFuncBody, returnTypes);

          if (returnTypes.length === 0) {
            return;
          } // void function — nothing to compare

          if (returnTypes.length === 1) {
            const singleType = returnTypes[0];
            // If the single return is already a union (e.g. ternary `x ? "a" : "b"`),
            // skip widening — TS preserves literal unions in this case.
            // Otherwise widen literal: TS widens single literal returns (e.g. "idle" → string).
            inferredType = singleType.isUnion()
              ? singleType
              : checker.getBaseTypeOfLiteralType(singleType);
          } else {
            const union = createUnionType(checker, returnTypes);
            if (!union) {
              return; // Internal API unavailable — skip safely
            }
            inferredType = union;
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

        // Also unwrap inferred type if it's Promise<T> or PromiseLike<T>
        // (e.g., return someAsyncFn()). In async functions, returning a thenable
        // resolves to T, so compare inner types.
        if (
          PROMISE_NAMES.has(inferredType.symbol?.name ?? '') &&
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
