import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';
import ts from 'typescript';
import {
  collectReturns,
  getExpressionType,
} from '../helpers/collect-return-types.js';
import { containsAny } from '../helpers/contains-any.js';
import { containsUnsafeTypeConstruct } from '../helpers/contains-unsafe-type-construct.js';
import { createUnionType } from '../helpers/create-union-type.js';
import { getPromiseTypeArg } from '../helpers/get-promise-type-arg.js';
import { hasEffectiveConstAssertion } from '../helpers/has-effective-const-assertion.js';
import { includesUndefined } from '../helpers/includes-undefined.js';
import { isEscapeHatch } from '../helpers/is-escape-hatch.js';
import { isExported } from '../helpers/is-exported.js';
import { isOnlyPropertyLiteralWidening } from '../helpers/is-only-property-literal-widening.js';
import { isOverloadImplementation } from '../helpers/is-overload-implementation.js';
import { truncateTypeString } from '../helpers/truncate-type-string.js';
import type { FunctionNode } from '../helpers/types.js';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/blob/main/docs/rules/${name}.md`,
);

type FixOption = 'suggestion' | 'autofix' | 'none';
type Options = [{ fix: FixOption }];

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

    // ── Phase 1: ESTree-only cheap checks ──────────────────────────────
    function shouldSkipByESTree(node: FunctionNode): boolean {
      if (!node.returnType || !node.body) {
        return true;
      }

      if (
        node.parent.type === 'MethodDefinition' &&
        node.parent.kind === 'set'
      ) {
        return true;
      }
      if (
        node.parent.type === 'MethodDefinition' &&
        node.parent.kind === 'get'
      ) {
        // Skip getter+setter pairs — return type must be consistent with setter parameter
        const classBody = node.parent.parent;
        if (classBody.type === 'ClassBody') {
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
          if (hasSetter) {
            return true;
          }
        }
      }
      if (
        node.parent.type === 'MethodDefinition' &&
        node.parent.override === true
      ) {
        // override method — v1 skip
        // Override methods must be compatible with the parent class return type,
        // so flagging them causes false positives the developer cannot fix.
        // TODO(v2): Could check if the override uses a covariant (narrowed) return
        // type and only skip when the annotated type exactly matches the parent.
        return true;
      }
      if (node.generator) {
        // generators — v1 skip
        // TODO(v2): Generator return type is Generator<T, TReturn, TNext>.
        // Unwrapping the yielded/return types is non-trivial. Skipped for v1.
        return true;
      }
      return false;
    }

    // ── Phase 2+3: Resolve annotated type ──────────────────────────────
    function resolveAnnotatedType(
      node: FunctionNode,
      tsFunctionNode: ts.Node,
    ): ts.Type | undefined {
      if (isOverloadImplementation(tsFunctionNode, checker)) {
        return undefined;
      }

      const tsReturnTypeNode = parserServices.esTreeNodeToTSNodeMap.get(
        node.returnType!.typeAnnotation,
      );
      if (!ts.isTypeNode(tsReturnTypeNode)) {
        return undefined;
      }
      const annotatedType = checker.getTypeFromTypeNode(tsReturnTypeNode);
      if (isEscapeHatch(annotatedType)) {
        return undefined;
      }

      // Generic functions: skip only when annotation contains complex type constructs
      // (conditional, mapped, index, indexed-access) where isTypeAssignableTo is unreliable.
      // Simple type parameter usage (T, T[], T | null, { prop: T }) works correctly
      // with bidirectional assignability — TS handles type parameter identity.
      if (
        node.typeParameters &&
        containsUnsafeTypeConstruct(checker, annotatedType)
      ) {
        return undefined;
      }

      return annotatedType;
    }

    // ── Phase 4: Resolve inferred type ─────────────────────────────────
    // "inferred" here means the approximated function return type:
    // - Single return: widened via getBaseTypeOfLiteralType unless already a union
    //   (matches TS signature inference — unions from ternaries are preserved as-is)
    // - Multi return: literal union from return expressions (matches TS union inference)
    function resolveInferredType(
      node: FunctionNode,
      tsFunctionNode: ts.Node,
    ): { inferredType: ts.Type; hasAnyConstReturn: boolean } | undefined {
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
          const rawType = ts.isExpression(tsBodyExpr)
            ? getExpressionType(checker, tsBodyExpr)
            : checker.getTypeAtLocation(tsBodyExpr);
          const isConst =
            ts.isExpression(tsBodyExpr) &&
            hasEffectiveConstAssertion(checker, tsBodyExpr);
          return {
            inferredType: isConst
              ? rawType
              : checker.getBaseTypeOfLiteralType(rawType),
            hasAnyConstReturn: isConst,
          };
        }

        // Block body: traverse return statements
        const tsFuncBody = (
          tsFunctionNode as
            | ts.FunctionDeclaration
            | ts.FunctionExpression
            | ts.ArrowFunction
            | ts.MethodDeclaration
        ).body;
        if (!tsFuncBody || !ts.isBlock(tsFuncBody)) {
          return undefined;
        }

        const returns = collectReturns(checker, tsFuncBody);

        if (returns.length === 0) {
          return undefined; // void function — nothing to compare
        }

        if (returns.length === 1) {
          const { type: singleType, expression: returnExpr } = returns[0];
          const isConst = hasEffectiveConstAssertion(checker, returnExpr);
          return {
            inferredType:
              singleType.isUnion() || isConst
                ? singleType
                : checker.getBaseTypeOfLiteralType(singleType),
            hasAnyConstReturn: isConst,
          };
        }

        const union = createUnionType(
          checker,
          returns.map((r) => r.type),
        );
        if (!union) {
          return undefined;
        }
        return {
          inferredType: union,
          hasAnyConstReturn: returns.some((r) =>
            hasEffectiveConstAssertion(checker, r.expression),
          ),
        };
      } catch (_e) {
        // Intentional broad catch: TypeScript's type resolution throws on recursive /
        // mutually-recursive functions (circular type dependency). Any other exception
        // here also results in a missed diagnostic rather than a crash.
        return undefined;
      }
    }

    // ── Phase 5: Compare types and report ──────────────────────────────
    function compareAndReport(
      node: FunctionNode,
      tsFunctionNode: ts.Node,
      annotatedType: ts.Type,
      inferredType: ts.Type,
      hasAnyConstReturn: boolean,
    ): void {
      if (containsAny(checker, inferredType)) {
        return; // any-contaminated inference is unreliable
      }

      // Inferred type may contain utility types resolved to conditional types
      // (e.g., Awaited<T> from Promise.resolve) or intersection narrowing
      // (e.g., NonNullable<T> = T & {} from non-null assertion).
      // These make isTypeAssignableTo unreliable — skip to avoid false positives.
      if (node.typeParameters) {
        if (containsUnsafeTypeConstruct(checker, inferredType)) {
          return;
        }
        // NonNullable<T> = T & {} — intersection with type parameter from TS internal narrowing
        if (
          inferredType.isIntersection() &&
          inferredType.types.some((t) => t.flags & ts.TypeFlags.TypeParameter)
        ) {
          return;
        }
      }

      // For async functions, unwrap Promise<T> to compare inner types.
      const resolved = (() => {
        if (!node.async) {
          return {
            effectiveInferred: inferredType,
            effectiveAnnotated: annotatedType,
          };
        }
        const annotatedInner = getPromiseTypeArg(checker, annotatedType);
        if (!annotatedInner || isEscapeHatch(annotatedInner)) {
          return undefined;
        }
        const inferredInner = getPromiseTypeArg(checker, inferredType);
        return {
          effectiveInferred: inferredInner ?? inferredType,
          effectiveAnnotated: annotatedInner,
        };
      })();
      if (!resolved) {
        return;
      }
      const { effectiveInferred, effectiveAnnotated } = resolved;

      if (
        includesUndefined(effectiveAnnotated) &&
        !includesUndefined(effectiveInferred)
      ) {
        return; // implicit undefined path heuristic
      }

      // isTypeAssignableTo is public API since TypeScript 5.4
      const inferredFitsInAnnotated = checker.isTypeAssignableTo(
        effectiveInferred,
        effectiveAnnotated,
      );
      const annotatedFitsInInferred = checker.isTypeAssignableTo(
        effectiveAnnotated,
        effectiveInferred,
      );
      // Annotated is wider: inferred fits into annotated, but not vice versa
      if (!inferredFitsInAnnotated || annotatedFitsInInferred) {
        return;
      }

      // Skip union redundancy: T | string where T extends string -> semantically just string.
      // TypeScript doesn't collapse these unions, so isTypeAssignableTo sees them as wider,
      // but the extra member is already a supertype of T's constraint — not misleading.
      if (effectiveAnnotated.isUnion() && node.typeParameters) {
        const typeParamMembers = effectiveAnnotated.types.filter(
          (t) => t.flags & ts.TypeFlags.TypeParameter,
        );
        const allSubsumed =
          typeParamMembers.length > 0 &&
          typeParamMembers.every((tp) => {
            const constraint = checker.getBaseConstraintOfType(tp);
            if (!constraint) {
              return false;
            }
            return effectiveAnnotated.types.some(
              (other) =>
                other !== tp && checker.isTypeAssignableTo(constraint, other),
            );
          });
        if (allSubsumed) {
          return;
        }
      }

      // Skip false positives from object literal property widening (e.g., false -> boolean)
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

      report(node, tsFunctionNode, annotatedType, effectiveInferred);
    }

    // ── Reporting ──────────────────────────────────────────────────────
    function report(
      node: FunctionNode,
      tsFunctionNode: ts.Node,
      annotatedType: ts.Type,
      effectiveInferred: ts.Type,
    ): void {
      // Build the inferred type string for the message.
      // For async functions, re-wrap effectiveInferred using the original wrapper name
      // (Promise) to preserve the user's intent.
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
        context.report({
          node: node.returnType!,
          messageId: 'misleadingReturnType',
          data: reportData,
          fix: (fixer) => fixer.remove(node.returnType!),
        });
        return;
      }

      if (effectiveFix !== 'suggestion') {
        context.report({
          node: node.returnType!,
          messageId: 'misleadingReturnType',
          data: reportData,
        });
        return;
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
        context.report({
          node: node.returnType!,
          messageId: 'misleadingReturnType',
          data: reportData,
        });
        return;
      }

      context.report({
        node: node.returnType!,
        messageId: 'misleadingReturnType',
        data: reportData,
        suggest: suggestions,
      });
    }

    // ── Orchestrator ───────────────────────────────────────────────────
    function checkFunction(node: FunctionNode) {
      if (shouldSkipByESTree(node)) {
        return;
      }

      const tsFunctionNode = parserServices.esTreeNodeToTSNodeMap.get(node);

      const annotatedType = resolveAnnotatedType(node, tsFunctionNode);
      if (!annotatedType) {
        return;
      }

      const inferred = resolveInferredType(node, tsFunctionNode);
      if (!inferred) {
        return;
      }

      compareAndReport(
        node,
        tsFunctionNode,
        annotatedType,
        inferred.inferredType,
        inferred.hasAnyConstReturn,
      );
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
});
