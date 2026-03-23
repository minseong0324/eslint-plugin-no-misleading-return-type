import ts from 'typescript';

export function createTypeResolver(code: string) {
  const fileName = 'test.ts';
  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
  );
  const host = ts.createCompilerHost({ strict: true });
  const originalGetSourceFile = host.getSourceFile;
  host.getSourceFile = (name, ...args) =>
    name === fileName
      ? sourceFile
      : originalGetSourceFile.call(host, name, ...args);

  const program = ts.createProgram([fileName], { strict: true }, host);
  const checker = program.getTypeChecker();

  return {
    checker,
    getType(typeName: string) {
      let type: ts.Type | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isTypeAliasDeclaration(node) && node.name.text === typeName) {
          type = checker.getTypeAtLocation(node.name);
        }
        if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === typeName) {
              type = checker.getTypeAtLocation(decl.name);
            }
          }
        }
      });
      if (!type) {
        throw new Error(`Type "${typeName}" not found`);
      }
      return type;
    },
  };
}
