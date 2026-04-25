import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

export interface ParamInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface FlowStep {
  type: "start" | "end" | "call" | "block" | "return" | "throw" | "if" | "loop" | "try" | "switch";
  label: string;
  line: number;
  yes?: FlowStep[];    // if-true branch / loop body / try body
  no?: FlowStep[];     // else branch
  catch_?: FlowStep[]; // catch block
  finally_?: FlowStep[]; // finally block
}

export interface FunctionNode {
  id: string;
  name: string;
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  params: ParamInfo[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  docComment?: string;
  kind: "function" | "method" | "arrow" | "constructor";
  className?: string;
  flowSteps?: FlowStep[];
}

export interface CallEdge {
  id: string;
  source: string;
  target: string;
  callLine: number;
  args: string[];
}

export interface GraphData {
  nodes: FunctionNode[];
  edges: CallEdge[];
  files: string[];
  analysisTime: number;
  projectRoot: string;
}

export class TypeScriptAnalyzer {
  private rootPath: string;
  private program!: ts.Program;
  private checker!: ts.TypeChecker;
  private functionMap = new Map<string, FunctionNode>();
  private edges: CallEdge[] = [];
  private excludePatterns: string[];

  constructor(rootPath: string, excludePatterns?: string[]) {
    this.rootPath = rootPath;
    this.excludePatterns = excludePatterns || [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/*.d.ts",
    ];
  }

  async analyzeProject(): Promise<GraphData> {
    const start = Date.now();
    const files = this.findTypeScriptFiles(this.rootPath);
    this.buildProgram(files);
    this.extractFunctions(files);
    this.extractCalls(files);
    return {
      nodes: Array.from(this.functionMap.values()),
      edges: this.edges,
      files,
      analysisTime: Date.now() - start,
      projectRoot: this.rootPath,
    };
  }

  async analyzeFile(filePath: string): Promise<GraphData> {
    const start = Date.now();
    const allFiles = this.findTypeScriptFiles(this.rootPath);

    this.buildProgram(allFiles);
    this.extractFunctions(allFiles);
    this.extractCalls(allFiles);

    const normLow = (p: string) => path.normalize(p).toLowerCase();
    const targetNorm = normLow(filePath);

    const fileFuncIds = new Set<string>();
    for (const [id, node] of this.functionMap) {
      if (normLow(node.filePath) === targetNorm) fileFuncIds.add(id);
    }

    const relevantEdges = this.edges.filter(
      (e) => fileFuncIds.has(e.source) || fileFuncIds.has(e.target)
    );

    const relevantNodeIds = new Set<string>(fileFuncIds);
    relevantEdges.forEach((e) => {
      relevantNodeIds.add(e.source);
      relevantNodeIds.add(e.target);
    });

    const relevantNodes = Array.from(this.functionMap.values()).filter((n) =>
      relevantNodeIds.has(n.id)
    );

    return {
      nodes: relevantNodes,
      edges: relevantEdges,
      files: [filePath],
      analysisTime: Date.now() - start,
      projectRoot: this.rootPath,
    };
  }

  private findTypeScriptFiles(rootDir: string): string[] {
    const results: string[] = [];
    const excluded = new Set(["node_modules", "dist", "out", ".git", "coverage"]);
    const walk = (dir: string) => {
      let entries: string[];
      try { entries = fs.readdirSync(dir); } catch { return; }
      for (const entry of entries) {
        if (excluded.has(entry)) continue;
        const fullPath = path.join(dir, entry);
        let stat: fs.Stats;
        try { stat = fs.statSync(fullPath); } catch { continue; }
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if ((fullPath.endsWith(".ts") || fullPath.endsWith(".js")) && !fullPath.endsWith(".d.ts")) {
          results.push(fullPath);
        }
      }
    };
    walk(rootDir);
    return results;
  }

  private buildProgram(files: string[]) {
    const configFile = ts.findConfigFile(this.rootPath, ts.sys.fileExists, "tsconfig.json");
    let compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      allowJs: true,
      noEmit: true,
      skipLibCheck: true,
    };
    if (configFile) {
      const configContent = ts.readConfigFile(configFile, ts.sys.readFile);
      const parsed = ts.parseJsonConfigFileContent(configContent.config, ts.sys, path.dirname(configFile));
      compilerOptions = { ...parsed.options, noEmit: true };
    }
    this.program = ts.createProgram(files, compilerOptions);
    this.checker = this.program.getTypeChecker();
  }

  private makeNodeId(name: string, filePath: string, line: number): string {
    const rel = path.relative(this.rootPath, filePath).replace(/\\/g, "/");
    return `${rel}::${name}::L${line}`;
  }

  private getDocComment(node: ts.FunctionLikeDeclaration): string | undefined {
    const sourceFile = node.getSourceFile();
    const fullText = sourceFile.getFullText();
    const nodeText = fullText.slice(Math.max(0, node.getFullStart() - 200), node.getStart());
    const jsDocMatch = nodeText.match(/\/\*\*([\s\S]*?)\*\//);
    if (jsDocMatch) {
      return jsDocMatch[1].split("\n").map((l) => l.replace(/^\s*\*\s?/, "").trim()).filter(Boolean).join(" ");
    }
    return undefined;
  }

  private extractParamInfo(params: ts.NodeArray<ts.ParameterDeclaration>): ParamInfo[] {
    return params.map((p) => {
      const name = p.name.getText();
      let type = "any";
      if (p.type) { type = p.type.getText(); } else {
        try { const t = this.checker.getTypeAtLocation(p); type = this.checker.typeToString(t); } catch { }
      }
      return { name, type, optional: !!p.questionToken || !!p.initializer, defaultValue: p.initializer?.getText() };
    });
  }

  // ── Flowchart extraction ─────────────────────────────────────────────────────
  private trunc(s: string, n = 60): string {
    const clean = s.replace(/\s+/g, " ").trim();
    return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
  }

  private buildFlowSteps(body: ts.Block | undefined, sf: ts.SourceFile): FlowStep[] {
    if (!body || !ts.isBlock(body)) return [];
    const steps: FlowStep[] = [];

    for (const stmt of body.statements) {
      const { line } = sf.getLineAndCharacterOfPosition(stmt.getStart());
      const ln = line + 1;

      if (ts.isIfStatement(stmt)) {
        const cond = this.trunc(stmt.expression.getText(), 55);
        const step: FlowStep = { type: "if", label: `if (${cond})`, line: ln };
        const then = stmt.thenStatement;
        step.yes = ts.isBlock(then) ? this.buildFlowSteps(then as ts.Block, sf) : [{ type: "block", label: this.trunc(then.getText()), line: ln }];
        if (stmt.elseStatement) {
          const el = stmt.elseStatement;
          step.no = ts.isBlock(el) ? this.buildFlowSteps(el as ts.Block, sf) : ts.isIfStatement(el) ? this.buildFlowSteps({ statements: [el] } as unknown as ts.Block, sf) : [{ type: "block", label: this.trunc(el.getText()), line: ln }];
        }
        steps.push(step);

      } else if (ts.isForStatement(stmt) || ts.isWhileStatement(stmt) || ts.isForOfStatement(stmt) || ts.isForInStatement(stmt)) {
        let cond = "...";
        let kind = "for";
        if (ts.isForStatement(stmt)) { cond = stmt.condition ? this.trunc(stmt.condition.getText(), 50) : "..."; kind = "for"; }
        else if (ts.isWhileStatement(stmt)) { cond = this.trunc((stmt as ts.WhileStatement).expression.getText(), 50); kind = "while"; }
        else if (ts.isForOfStatement(stmt)) { cond = this.trunc(stmt.expression.getText(), 50); kind = "for…of"; }
        else if (ts.isForInStatement(stmt)) { cond = this.trunc(stmt.expression.getText(), 50); kind = "for…in"; }
        const loopBody = (stmt as any).statement as ts.Statement;
        steps.push({ type: "loop", label: `${kind} (${cond})`, line: ln, yes: ts.isBlock(loopBody) ? this.buildFlowSteps(loopBody as ts.Block, sf) : [] });

      } else if (ts.isDoStatement(stmt)) {
        const cond = this.trunc(stmt.expression.getText(), 50);
        steps.push({ type: "loop", label: `do…while (${cond})`, line: ln, yes: ts.isBlock(stmt.statement) ? this.buildFlowSteps(stmt.statement as ts.Block, sf) : [] });

      } else if (ts.isTryStatement(stmt)) {
        const step: FlowStep = { type: "try", label: "try", line: ln };
        step.yes = this.buildFlowSteps(stmt.tryBlock, sf);
        if (stmt.catchClause?.block) step.catch_ = this.buildFlowSteps(stmt.catchClause.block, sf);
        if (stmt.finallyBlock) step.finally_ = this.buildFlowSteps(stmt.finallyBlock, sf);
        steps.push(step);

      } else if (ts.isReturnStatement(stmt)) {
        const val = stmt.expression ? this.trunc(stmt.expression.getText()) : "";
        steps.push({ type: "return", label: val ? `return ${val}` : "return", line: ln });

      } else if (ts.isThrowStatement(stmt)) {
        steps.push({ type: "throw", label: `throw ${this.trunc(stmt.expression.getText(), 50)}`, line: ln });

      } else if (ts.isSwitchStatement(stmt)) {
        const cond = this.trunc(stmt.expression.getText(), 50);
        const cases: FlowStep[] = stmt.caseBlock.clauses.map(cl => {
          const lbl = ts.isCaseClause(cl) ? `case ${this.trunc(cl.expression.getText(), 30)}:` : "default:";
          const { line: cl_line } = sf.getLineAndCharacterOfPosition(cl.getStart());
          const innerBody = cl.statements.map(s => {
            const { line: sl } = sf.getLineAndCharacterOfPosition(s.getStart());
            return { type: "block" as const, label: this.trunc(s.getText()), line: sl + 1 };
          });
          return { type: "if" as const, label: lbl, line: cl_line + 1, yes: innerBody };
        });
        steps.push({ type: "switch", label: `switch (${cond})`, line: ln, yes: cases });

      } else if (ts.isExpressionStatement(stmt)) {
        const expr = stmt.expression;
        const text = this.trunc(expr.getText());
        if (ts.isCallExpression(expr) || ts.isAwaitExpression(expr) || (ts.isBinaryExpression(expr) && ts.isCallExpression(expr.right))) {
          steps.push({ type: "call", label: text, line: ln });
        } else {
          steps.push({ type: "block", label: text, line: ln });
        }

      } else if (ts.isVariableStatement(stmt)) {
        steps.push({ type: "block", label: this.trunc(stmt.getText()), line: ln });
      }
    }

    return steps;
  }

  private extractFunctions(files: string[]) {
    for (const filePath of files) {
      const sourceFile = this.program.getSourceFile(filePath);
      if (!sourceFile) continue;
      const fileName = path.basename(filePath);

      const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isConstructorDeclaration(node)) {
          const fn = node as ts.FunctionLikeDeclaration;
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(fn.getStart());

          let name = "anonymous";
          let kind: FunctionNode["kind"] = "function";
          let className: string | undefined;
          let isExported = false;

          if (ts.isConstructorDeclaration(fn)) {
            name = "constructor"; kind = "constructor";
            const classDecl = fn.parent;
            if (ts.isClassDeclaration(classDecl) && classDecl.name) { className = classDecl.name.getText(); name = `${className}.constructor`; }
          } else if (ts.isMethodDeclaration(fn) && fn.name) {
            name = fn.name.getText(); kind = "method";
            const classDecl = fn.parent;
            if (ts.isClassDeclaration(classDecl) && classDecl.name) { className = classDecl.name.getText(); name = `${className}.${name}`; }
          } else if (ts.isFunctionDeclaration(fn) && fn.name) {
            name = fn.name.getText(); kind = "function";
            isExported = !!fn.modifiers && fn.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
          } else if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
            kind = ts.isArrowFunction(fn) ? "arrow" : "function";
            const parent = fn.parent;
            if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
              name = parent.name.getText();
              const varStmt = parent.parent?.parent;
              if (varStmt && ts.isVariableStatement(varStmt) && varStmt.modifiers) {
                isExported = varStmt.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
              }
            } else if (ts.isPropertyDeclaration(parent) && ts.isIdentifier(parent.name)) {
              name = parent.name.getText();
              const classDecl = parent.parent;
              if (ts.isClassDeclaration(classDecl) && classDecl.name) { className = classDecl.name.getText(); name = `${className}.${name}`; }
            } else if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
              name = parent.name.getText();
            }
          }

          let returnType = "void";
          if (fn.type) { returnType = fn.type.getText(); } else {
            try { const sig = this.checker.getSignatureFromDeclaration(fn); if (sig) returnType = this.checker.typeToString(sig.getReturnType()); } catch { }
          }

          const isAsync = !!fn.modifiers && fn.modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
          const id = this.makeNodeId(name, filePath, line + 1);
          const params = this.extractParamInfo(fn.parameters);
          const docComment = this.getDocComment(fn);

          // Extract flowchart steps from the function body
          const body = fn.body && ts.isBlock(fn.body) ? fn.body as ts.Block : undefined;
          const flowSteps: FlowStep[] = body ? this.buildFlowSteps(body, sourceFile) : [];

          this.functionMap.set(id, { id, name, filePath, fileName, line: line + 1, column: character + 1, params, returnType, isAsync, isExported, docComment, kind, className, flowSteps });
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }
  }

  private extractCalls(files: string[]) {
    for (const filePath of files) {
      const sourceFile = this.program.getSourceFile(filePath);
      if (!sourceFile) continue;

      const getEnclosingFunctionId = (node: ts.Node): string | null => {
        let current: ts.Node | undefined = node.parent;
        while (current) {
          if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current) || ts.isArrowFunction(current) || ts.isFunctionExpression(current) || ts.isConstructorDeclaration(current)) {
            const fn = current as ts.FunctionLikeDeclaration;
            const { line } = sourceFile.getLineAndCharacterOfPosition(fn.getStart());
            let name = "anonymous";
            if (ts.isConstructorDeclaration(fn)) {
              name = "constructor";
              const cls = fn.parent;
              if (ts.isClassDeclaration(cls) && cls.name) name = `${cls.name.getText()}.constructor`;
            } else if (ts.isMethodDeclaration(fn) && fn.name) {
              name = fn.name.getText();
              const cls = fn.parent;
              if (ts.isClassDeclaration(cls) && cls.name) name = `${cls.name.getText()}.${name}`;
            } else if (ts.isFunctionDeclaration(fn) && fn.name) {
              name = fn.name.getText();
            } else if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
              const p = fn.parent;
              if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) { name = p.name.getText(); }
              else if (ts.isPropertyDeclaration(p) && ts.isIdentifier(p.name)) {
                name = p.name.getText();
                const cls = p.parent;
                if (ts.isClassDeclaration(cls) && cls.name) name = `${cls.name.getText()}.${name}`;
              } else if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) { name = p.name.getText(); }
              else { current = current.parent; continue; }
            }
            return this.makeNodeId(name, filePath, line + 1);
          }
          current = current.parent;
        }
        return null;
      };

      const normLow = (p: string) => path.normalize(p).toLowerCase();

      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
          const callerNodeId = getEnclosingFunctionId(node);
          if (!callerNodeId || !this.functionMap.has(callerNodeId)) { ts.forEachChild(node, visit); return; }

          let calleeId: string | null = null;

          try {
            const symbol = this.checker.getSymbolAtLocation(node.expression);
            if (symbol) {
              let resolvedSymbol = symbol;
              try { resolvedSymbol = this.checker.getAliasedSymbol(symbol); } catch { }
              const decl = resolvedSymbol.valueDeclaration || resolvedSymbol.declarations?.[0] || symbol.valueDeclaration || symbol.declarations?.[0];
              if (decl) {
                const df = decl.getSourceFile();
                const { line } = df.getLineAndCharacterOfPosition(decl.getStart());
                const symName = resolvedSymbol.getName() !== "__missing" ? resolvedSymbol.getName() : symbol.getName();
                const dfLow = normLow(df.fileName);
                if (this.functionMap.has(this.makeNodeId(symName, df.fileName, line + 1))) { calleeId = this.makeNodeId(symName, df.fileName, line + 1); }
                if (!calleeId) {
                  for (const [id, fn] of this.functionMap) {
                    const mp = fn.name.includes(".") ? fn.name.split(".").pop()! : fn.name;
                    if (normLow(fn.filePath) === dfLow && mp === symName && fn.line === line + 1) { calleeId = id; break; }
                  }
                }
                if (!calleeId) {
                  for (const [id, fn] of this.functionMap) {
                    const mp = fn.name.includes(".") ? fn.name.split(".").pop()! : fn.name;
                    if (normLow(fn.filePath) === dfLow && mp === symName) { calleeId = id; break; }
                  }
                }
              }
            }
          } catch { }

          if (!calleeId && ts.isPropertyAccessExpression(node.expression)) {
            const propName = node.expression.name.text;
            const callerFn = this.functionMap.get(callerNodeId)!;
            const callerFileLow = normLow(callerFn.filePath);
            const hits: string[] = [];
            for (const [id, fn] of this.functionMap) {
              const mp = fn.name.includes(".") ? fn.name.split(".").pop()! : fn.name;
              if (mp === propName) hits.push(id);
            }
            if (hits.length === 1) { calleeId = hits[0]; }
            else if (hits.length > 1) {
              const external = hits.filter(id => normLow(this.functionMap.get(id)!.filePath) !== callerFileLow);
              calleeId = external.length > 0 ? external[0] : hits[0];
            }
          }

          if (!calleeId && ts.isIdentifier(node.expression)) {
            const fnName = node.expression.text;
            for (const [id, fn] of this.functionMap) {
              const base = fn.name.includes(".") ? fn.name.split(".").pop()! : fn.name;
              if (base === fnName) { calleeId = id; break; }
            }
          }

          if (calleeId && calleeId !== callerNodeId) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const args = node.arguments.map(a => { try { return a.getText().substring(0, 40); } catch { return "..."; } });
            const edgeId = `${callerNodeId}=>${calleeId}::L${line + 1}`;
            if (!this.edges.find(e => e.id === edgeId)) {
              this.edges.push({ id: edgeId, source: callerNodeId, target: calleeId, callLine: line + 1, args });
            }
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }
  }
}
