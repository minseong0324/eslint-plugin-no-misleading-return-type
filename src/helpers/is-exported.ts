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
    if (!nameSymbol) return false;
    const fileSymbol = checker.getSymbolAtLocation(nameNode.getSourceFile());
    if (!fileSymbol?.exports) return false;
    for (const exportedSymbol of fileSymbol.exports.values()) {
      if (exportedSymbol === nameSymbol) return true;
      if (exportedSymbol.flags & ts.SymbolFlags.Alias) {
        const resolved = checker.getAliasedSymbol(exportedSymbol);
        if (resolved === nameSymbol) return true;
      }
    }
    return false;
  };

  // Helper: check if an ESTree node has an export keyword ancestor.
  const hasExportParent = (target: TSESTree.Node): boolean => {
    const p = target.parent;
    if (!p) return false;
    if (
      p.type === 'ExportNamedDeclaration' ||
      p.type === 'ExportDefaultDeclaration'
    ) {
      return true;
    }
    // VariableDeclarator → VariableDeclaration → Export*Declaration
    if (
      p.type === 'VariableDeclarator' &&
      p.parent?.type === 'VariableDeclaration' &&
      (p.parent.parent?.type === 'ExportNamedDeclaration' ||
        p.parent.parent?.type === 'ExportDefaultDeclaration')
    ) {
      return true;
    }
    return false;
  };

  // Helper: resolve a TS variable declarator's name for symbol lookup.
  const isVarDeclExported = (esVarDecl: TSESTree.VariableDeclarator): boolean => {
    const tsVarDecl = parserServices.esTreeNodeToTSNodeMap.get(esVarDecl);
    if (
      ts.isVariableDeclaration(tsVarDecl) &&
      ts.isIdentifier(tsVarDecl.name)
    ) {
      return isSymbolExported(tsVarDecl.name);
    }
    return false;
  };

  // === Strategy 1: Direct export keyword on the function itself ===
  if (hasExportParent(node)) return true;

  // === Strategy 2: Function is assigned to a variable ===
  if (
    (node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression') &&
    node.parent?.type === 'VariableDeclarator'
  ) {
    if (hasExportParent(node.parent)) return true;
    // Check if the VariableDeclarator's name is used in `export { name }`
    // via TS symbol resolution — handles indirect and renamed exports.
    return isVarDeclExported(node.parent);
  }

  // === Strategy 3: Named function declaration ===
  if (ts.isFunctionDeclaration(tsFunctionNode) && tsFunctionNode.name) {
    return isSymbolExported(tsFunctionNode.name);
  }

  // === Strategy 4: Class method — check if owning class is exported ===
  if (node.parent?.type === 'MethodDefinition') {
    const classNode = node.parent.parent?.parent;
    if (classNode) {
      // Direct export on class
      if (hasExportParent(classNode)) return true;
      // export const Foo = class { ... }
      if (
        classNode.type === 'ClassExpression' &&
        classNode.parent?.type === 'VariableDeclarator'
      ) {
        if (hasExportParent(classNode.parent)) return true;
        return isVarDeclExported(classNode.parent);
      }
      // Indirect: class Foo {} ... export { Foo }
      if (classNode.type === 'ClassDeclaration' && classNode.id) {
        const tsClassNode = parserServices.esTreeNodeToTSNodeMap.get(classNode);
        if (ts.isClassDeclaration(tsClassNode) && tsClassNode.name) {
          return isSymbolExported(tsClassNode.name);
        }
      }
    }
  }

  // === Strategy 5: Object literal method — traverse up Property → ObjectExpression ===
  if (node.parent?.type === 'Property') {
    let objExpr: TSESTree.Node | undefined = node.parent.parent;
    while (objExpr?.type === 'ObjectExpression') {
      if (objExpr.parent?.type === 'ExportDefaultDeclaration') return true;
      if (objExpr.parent?.type === 'VariableDeclarator') {
        if (hasExportParent(objExpr.parent)) return true;
        return isVarDeclExported(objExpr.parent);
      }
      // Climb nested objects: ObjectExpression → Property → ObjectExpression
      if (objExpr.parent?.type === 'Property') {
        objExpr = objExpr.parent.parent;
      } else {
        break;
      }
    }
  }

  // === Strategy 6: CJS-style export = ===
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
