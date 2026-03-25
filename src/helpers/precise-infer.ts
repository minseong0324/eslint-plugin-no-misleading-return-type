import ts from 'typescript';

/**
 * Get the actual inferred return type by creating a shadow source
 * with the return type annotation removed, then asking TypeScript
 * to infer the return type from the function body alone.
 *
 * This is more accurate than the approximate approach (which uses
 * getBaseTypeOfLiteralType / manual union construction) but slower,
 * as it creates a new TS program per invocation.
 *
 * Returns the inferred return type as a string, or undefined on any error.
 */
export function inferReturnTypeWithoutAnnotation(
  program: ts.Program,
  sourceFile: ts.SourceFile,
  functionNode: ts.SignatureDeclaration,
): string | undefined {
  try {
    const sourceText = sourceFile.getFullText();
    const typeNode = functionNode.type;
    if (!typeNode) {
      return undefined;
    }

    // Remove ": Type" from the source
    const colonPos = findColonBeforeType(
      sourceText,
      typeNode.getStart(sourceFile),
    );
    if (colonPos === -1) {
      return undefined;
    }

    const shadowText =
      sourceText.slice(0, colonPos) + sourceText.slice(typeNode.end);
    const fileName = sourceFile.fileName;
    const compilerOptions = program.getCompilerOptions();

    // IMPORTANT: We must NOT return original program's source file objects
    // to the shadow program. ts.createProgram mutates internal state (parent
    // pointers, symbol links) on SourceFile nodes it processes. Sharing nodes
    // between programs corrupts the original program's state and causes
    // "Debug Failure" errors in subsequent type-checker operations.
    // Instead, we create fresh SourceFile instances from the text content.
    const shadowHost: ts.CompilerHost = {
      getSourceFile(name, languageVersion) {
        if (name === fileName) {
          return ts.createSourceFile(name, shadowText, languageVersion, true);
        }
        // Create a fresh copy instead of reusing the original SourceFile
        const original = program.getSourceFile(name);
        if (original) {
          return ts.createSourceFile(
            name,
            original.getFullText(),
            languageVersion,
            true,
          );
        }
        return undefined;
      },
      getDefaultLibFileName: () => ts.getDefaultLibFilePath(compilerOptions),
      writeFile() {
        /* no-op */
      },
      getCurrentDirectory: () => program.getCurrentDirectory(),
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (name) =>
        name === fileName || program.getSourceFile(name) !== undefined,
      readFile(name) {
        if (name === fileName) {
          return shadowText;
        }
        return program.getSourceFile(name)?.getFullText();
      },
    };

    const shadowProgram = ts.createProgram(
      [fileName],
      compilerOptions,
      shadowHost,
    );
    const shadowChecker = shadowProgram.getTypeChecker();
    const shadowFile = shadowProgram.getSourceFile(fileName);
    if (!shadowFile) {
      return undefined;
    }

    // Find the function at approximately the same position.
    // The position should be the same since the annotation comes after
    // the parameters, and we only removed the ": Type" portion.
    const funcStart = functionNode.getStart(sourceFile);
    const shadowFunc = findFunctionNear(shadowFile, funcStart);
    if (!shadowFunc) {
      return undefined;
    }

    const sig = shadowChecker.getSignatureFromDeclaration(shadowFunc);
    if (!sig) {
      return undefined;
    }

    const returnType = shadowChecker.getReturnTypeOfSignature(sig);
    return shadowChecker.typeToString(returnType);
  } catch {
    // Any error — fall back to approximate mode
    return undefined;
  }
}

/**
 * Walk backwards from the type annotation start to find the preceding ':'.
 * Only whitespace is allowed between the colon and the type.
 */
function findColonBeforeType(text: string, typeStart: number): number {
  for (let i = typeStart - 1; i >= 0; i--) {
    if (text[i] === ':') {
      return i;
    }
    if (
      text[i] !== ' ' &&
      text[i] !== '\n' &&
      text[i] !== '\r' &&
      text[i] !== '\t'
    ) {
      return -1;
    }
  }
  return -1;
}

/**
 * Find a function/method declaration near the given position in the AST.
 * We allow a small tolerance because removing the annotation could shift
 * positions slightly in edge cases.
 */
function findFunctionNear(
  sourceFile: ts.SourceFile,
  position: number,
): ts.SignatureDeclaration | undefined {
  function visit(node: ts.Node): ts.SignatureDeclaration | undefined {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)) &&
      Math.abs(node.getStart(sourceFile) - position) < 10
    ) {
      return node;
    }
    return ts.forEachChild(node, visit);
  }
  return visit(sourceFile);
}
