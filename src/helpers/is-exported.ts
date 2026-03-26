import type { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import type { FunctionNode } from './types.js';

type ParserServices = ReturnType<typeof ESLintUtils.getParserServices>;

/**
 * Check if removing this return type could break isolatedDeclarations.
 * Covers: direct exports, export-via-variable, exported class methods,
 * and indirect exports including `export { foo as bar }` renames.
 */
export function isExported(
  node: FunctionNode,
  tsFunctionNode: ts.Node,
  checker: ts.TypeChecker,
  parserServices: ParserServices,
): boolean {
  // Helper: check if a local symbol appears in the file's export map.
  // Must iterate values (not keys) because `export { foo as bar }` stores
  // the exported name ("bar") as key, not the local name ("foo").
  const isSymbolExported = (nameNode: ts.Node): boolean => {
    const nameSymbol = checker.getSymbolAtLocation(nameNode);
    if (!nameSymbol) {
      return false;
    }
    const fileSymbol = checker.getSymbolAtLocation(nameNode.getSourceFile());
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
  // FE/Arrow -> VariableDeclarator -> VariableDeclaration -> Export*Declaration
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
  // FE -> MethodDefinition -> ClassBody -> ClassDecl/Expr -> Export*Declaration
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
        (classNode.parent.parent.parent?.type === 'ExportNamedDeclaration' ||
          classNode.parent.parent.parent?.type === 'ExportDefaultDeclaration')
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
    const tsVarDecl = parserServices.esTreeNodeToTSNodeMap.get(node.parent);
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
        const tsClassNode = parserServices.esTreeNodeToTSNodeMap.get(classNode);
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

  // Case G: export const api = { method() {} } (object literal method)
  // Also handles: export default { method() {} }, nested objects, and indirect exports.
  // Traverses Property → ObjectExpression chains upward to find the owning declaration.
  if (node.parent?.type === 'Property') {
    let objExpr: TSESTree.Node | undefined = node.parent.parent;
    while (objExpr?.type === 'ObjectExpression') {
      // export default { method() {} } — ObjectExpression is direct child of ExportDefaultDeclaration
      if (objExpr.parent?.type === 'ExportDefaultDeclaration') {
        return true;
      }
      if (
        objExpr.parent?.type === 'VariableDeclarator' &&
        objExpr.parent.parent?.type === 'VariableDeclaration'
      ) {
        const varDeclParent = objExpr.parent.parent.parent;
        if (
          varDeclParent?.type === 'ExportNamedDeclaration' ||
          varDeclParent?.type === 'ExportDefaultDeclaration'
        ) {
          return true;
        }
        // indirect: const api = { ... }; export { api }
        const tsVarDecl = parserServices.esTreeNodeToTSNodeMap.get(
          objExpr.parent,
        );
        if (
          ts.isVariableDeclaration(tsVarDecl) &&
          ts.isIdentifier(tsVarDecl.name)
        ) {
          return isSymbolExported(tsVarDecl.name);
        }
        break;
      }
      // Climb one level: ObjectExpression → Property → (parent ObjectExpression)
      if (objExpr.parent?.type === 'Property') {
        objExpr = objExpr.parent.parent;
      } else {
        break;
      }
    }
  }

  // Case H: export = function/class (CJS-style TS export)
  if (
    node.parent?.type === 'TSExportAssignment' ||
    (node.parent?.type === 'VariableDeclarator' &&
      node.parent.parent?.type === 'VariableDeclaration' &&
      node.parent.parent.parent?.type === 'TSExportAssignment')
  ) {
    return true;
  }

  return false;
}
