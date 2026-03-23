import ts from 'typescript';

export function getFunctionFromCode(code: string, funcName: string) {
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

  let funcNode:
    | ts.FunctionDeclaration
    | ts.ArrowFunction
    | ts.FunctionExpression
    | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === funcName) {
      funcNode = node;
    }
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === funcName &&
          decl.initializer
        ) {
          if (
            ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer)
          ) {
            funcNode = decl.initializer;
          }
        }
      }
    }
  });

  if (!funcNode) {
    throw new Error(`Function "${funcName}" not found`);
  }
  return { node: funcNode, checker };
}
