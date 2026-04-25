"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptAnalyzer = void 0;
const ts = __importStar(require("typescript"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TypeScriptAnalyzer {
    constructor(rootPath, excludePatterns) {
        this.functionMap = new Map();
        this.edges = [];
        this.rootPath = rootPath;
        this.excludePatterns = excludePatterns || [
            "**/node_modules/**",
            "**/dist/**",
            "**/out/**",
            "**/*.d.ts",
        ];
    }
    async analyzeProject() {
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
    async analyzeFile(filePath) {
        const start = Date.now();
        const allFiles = this.findTypeScriptFiles(this.rootPath);
        this.buildProgram(allFiles);
        this.extractFunctions(allFiles);
        this.extractCalls(allFiles);
        const normLow = (p) => path.normalize(p).toLowerCase();
        const targetNorm = normLow(filePath);
        const fileFuncIds = new Set();
        for (const [id, node] of this.functionMap) {
            if (normLow(node.filePath) === targetNorm)
                fileFuncIds.add(id);
        }
        const relevantEdges = this.edges.filter((e) => fileFuncIds.has(e.source) || fileFuncIds.has(e.target));
        const relevantNodeIds = new Set(fileFuncIds);
        relevantEdges.forEach((e) => {
            relevantNodeIds.add(e.source);
            relevantNodeIds.add(e.target);
        });
        const relevantNodes = Array.from(this.functionMap.values()).filter((n) => relevantNodeIds.has(n.id));
        return {
            nodes: relevantNodes,
            edges: relevantEdges,
            files: [filePath],
            analysisTime: Date.now() - start,
            projectRoot: this.rootPath,
        };
    }
    findTypeScriptFiles(rootDir) {
        const results = [];
        const excluded = new Set(["node_modules", "dist", "out", ".git", "coverage"]);
        const walk = (dir) => {
            let entries;
            try {
                entries = fs.readdirSync(dir);
            }
            catch {
                return;
            }
            for (const entry of entries) {
                if (excluded.has(entry))
                    continue;
                const fullPath = path.join(dir, entry);
                let stat;
                try {
                    stat = fs.statSync(fullPath);
                }
                catch {
                    continue;
                }
                if (stat.isDirectory()) {
                    walk(fullPath);
                }
                else if ((fullPath.endsWith(".ts") || fullPath.endsWith(".js")) && !fullPath.endsWith(".d.ts")) {
                    results.push(fullPath);
                }
            }
        };
        walk(rootDir);
        return results;
    }
    buildProgram(files) {
        const configFile = ts.findConfigFile(this.rootPath, ts.sys.fileExists, "tsconfig.json");
        let compilerOptions = {
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
    makeNodeId(name, filePath, line) {
        const rel = path.relative(this.rootPath, filePath).replace(/\\/g, "/");
        return `${rel}::${name}::L${line}`;
    }
    getDocComment(node) {
        const sourceFile = node.getSourceFile();
        const fullText = sourceFile.getFullText();
        const nodeText = fullText.slice(Math.max(0, node.getFullStart() - 200), node.getStart());
        const jsDocMatch = nodeText.match(/\/\*\*([\s\S]*?)\*\//);
        if (jsDocMatch) {
            return jsDocMatch[1].split("\n").map((l) => l.replace(/^\s*\*\s?/, "").trim()).filter(Boolean).join(" ");
        }
        return undefined;
    }
    extractParamInfo(params) {
        return params.map((p) => {
            const name = p.name.getText();
            let type = "any";
            if (p.type) {
                type = p.type.getText();
            }
            else {
                try {
                    const t = this.checker.getTypeAtLocation(p);
                    type = this.checker.typeToString(t);
                }
                catch { }
            }
            return { name, type, optional: !!p.questionToken || !!p.initializer, defaultValue: p.initializer?.getText() };
        });
    }
    // ── Flowchart extraction ─────────────────────────────────────────────────────
    trunc(s, n = 60) {
        const clean = s.replace(/\s+/g, " ").trim();
        return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
    }
    buildFlowSteps(body, sf) {
        if (!body || !ts.isBlock(body))
            return [];
        const steps = [];
        for (const stmt of body.statements) {
            const { line } = sf.getLineAndCharacterOfPosition(stmt.getStart());
            const ln = line + 1;
            if (ts.isIfStatement(stmt)) {
                const cond = this.trunc(stmt.expression.getText(), 55);
                const step = { type: "if", label: `if (${cond})`, line: ln };
                const then = stmt.thenStatement;
                step.yes = ts.isBlock(then) ? this.buildFlowSteps(then, sf) : [{ type: "block", label: this.trunc(then.getText()), line: ln }];
                if (stmt.elseStatement) {
                    const el = stmt.elseStatement;
                    step.no = ts.isBlock(el) ? this.buildFlowSteps(el, sf) : ts.isIfStatement(el) ? this.buildFlowSteps({ statements: [el] }, sf) : [{ type: "block", label: this.trunc(el.getText()), line: ln }];
                }
                steps.push(step);
            }
            else if (ts.isForStatement(stmt) || ts.isWhileStatement(stmt) || ts.isForOfStatement(stmt) || ts.isForInStatement(stmt)) {
                let cond = "...";
                let kind = "for";
                if (ts.isForStatement(stmt)) {
                    cond = stmt.condition ? this.trunc(stmt.condition.getText(), 50) : "...";
                    kind = "for";
                }
                else if (ts.isWhileStatement(stmt)) {
                    cond = this.trunc(stmt.expression.getText(), 50);
                    kind = "while";
                }
                else if (ts.isForOfStatement(stmt)) {
                    cond = this.trunc(stmt.expression.getText(), 50);
                    kind = "for…of";
                }
                else if (ts.isForInStatement(stmt)) {
                    cond = this.trunc(stmt.expression.getText(), 50);
                    kind = "for…in";
                }
                const loopBody = stmt.statement;
                steps.push({ type: "loop", label: `${kind} (${cond})`, line: ln, yes: ts.isBlock(loopBody) ? this.buildFlowSteps(loopBody, sf) : [] });
            }
            else if (ts.isDoStatement(stmt)) {
                const cond = this.trunc(stmt.expression.getText(), 50);
                steps.push({ type: "loop", label: `do…while (${cond})`, line: ln, yes: ts.isBlock(stmt.statement) ? this.buildFlowSteps(stmt.statement, sf) : [] });
            }
            else if (ts.isTryStatement(stmt)) {
                const step = { type: "try", label: "try", line: ln };
                step.yes = this.buildFlowSteps(stmt.tryBlock, sf);
                if (stmt.catchClause?.block)
                    step.catch_ = this.buildFlowSteps(stmt.catchClause.block, sf);
                if (stmt.finallyBlock)
                    step.finally_ = this.buildFlowSteps(stmt.finallyBlock, sf);
                steps.push(step);
            }
            else if (ts.isReturnStatement(stmt)) {
                const val = stmt.expression ? this.trunc(stmt.expression.getText()) : "";
                steps.push({ type: "return", label: val ? `return ${val}` : "return", line: ln });
            }
            else if (ts.isThrowStatement(stmt)) {
                steps.push({ type: "throw", label: `throw ${this.trunc(stmt.expression.getText(), 50)}`, line: ln });
            }
            else if (ts.isSwitchStatement(stmt)) {
                const cond = this.trunc(stmt.expression.getText(), 50);
                const cases = stmt.caseBlock.clauses.map(cl => {
                    const lbl = ts.isCaseClause(cl) ? `case ${this.trunc(cl.expression.getText(), 30)}:` : "default:";
                    const { line: cl_line } = sf.getLineAndCharacterOfPosition(cl.getStart());
                    const innerBody = cl.statements.map(s => {
                        const { line: sl } = sf.getLineAndCharacterOfPosition(s.getStart());
                        return { type: "block", label: this.trunc(s.getText()), line: sl + 1 };
                    });
                    return { type: "if", label: lbl, line: cl_line + 1, yes: innerBody };
                });
                steps.push({ type: "switch", label: `switch (${cond})`, line: ln, yes: cases });
            }
            else if (ts.isExpressionStatement(stmt)) {
                const expr = stmt.expression;
                const text = this.trunc(expr.getText());
                if (ts.isCallExpression(expr) || ts.isAwaitExpression(expr) || (ts.isBinaryExpression(expr) && ts.isCallExpression(expr.right))) {
                    steps.push({ type: "call", label: text, line: ln });
                }
                else {
                    steps.push({ type: "block", label: text, line: ln });
                }
            }
            else if (ts.isVariableStatement(stmt)) {
                steps.push({ type: "block", label: this.trunc(stmt.getText()), line: ln });
            }
        }
        return steps;
    }
    extractFunctions(files) {
        for (const filePath of files) {
            const sourceFile = this.program.getSourceFile(filePath);
            if (!sourceFile)
                continue;
            const fileName = path.basename(filePath);
            const visit = (node) => {
                if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isConstructorDeclaration(node)) {
                    const fn = node;
                    const { line, character } = sourceFile.getLineAndCharacterOfPosition(fn.getStart());
                    let name = "anonymous";
                    let kind = "function";
                    let className;
                    let isExported = false;
                    if (ts.isConstructorDeclaration(fn)) {
                        name = "constructor";
                        kind = "constructor";
                        const classDecl = fn.parent;
                        if (ts.isClassDeclaration(classDecl) && classDecl.name) {
                            className = classDecl.name.getText();
                            name = `${className}.constructor`;
                        }
                    }
                    else if (ts.isMethodDeclaration(fn) && fn.name) {
                        name = fn.name.getText();
                        kind = "method";
                        const classDecl = fn.parent;
                        if (ts.isClassDeclaration(classDecl) && classDecl.name) {
                            className = classDecl.name.getText();
                            name = `${className}.${name}`;
                        }
                    }
                    else if (ts.isFunctionDeclaration(fn) && fn.name) {
                        name = fn.name.getText();
                        kind = "function";
                        isExported = !!fn.modifiers && fn.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
                    }
                    else if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
                        kind = ts.isArrowFunction(fn) ? "arrow" : "function";
                        const parent = fn.parent;
                        if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
                            name = parent.name.getText();
                            const varStmt = parent.parent?.parent;
                            if (varStmt && ts.isVariableStatement(varStmt) && varStmt.modifiers) {
                                isExported = varStmt.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
                            }
                        }
                        else if (ts.isPropertyDeclaration(parent) && ts.isIdentifier(parent.name)) {
                            name = parent.name.getText();
                            const classDecl = parent.parent;
                            if (ts.isClassDeclaration(classDecl) && classDecl.name) {
                                className = classDecl.name.getText();
                                name = `${className}.${name}`;
                            }
                        }
                        else if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
                            name = parent.name.getText();
                        }
                    }
                    let returnType = "void";
                    if (fn.type) {
                        returnType = fn.type.getText();
                    }
                    else {
                        try {
                            const sig = this.checker.getSignatureFromDeclaration(fn);
                            if (sig)
                                returnType = this.checker.typeToString(sig.getReturnType());
                        }
                        catch { }
                    }
                    const isAsync = !!fn.modifiers && fn.modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
                    const id = this.makeNodeId(name, filePath, line + 1);
                    const params = this.extractParamInfo(fn.parameters);
                    const docComment = this.getDocComment(fn);
                    // Extract flowchart steps from the function body
                    const body = fn.body && ts.isBlock(fn.body) ? fn.body : undefined;
                    const flowSteps = body ? this.buildFlowSteps(body, sourceFile) : [];
                    this.functionMap.set(id, { id, name, filePath, fileName, line: line + 1, column: character + 1, params, returnType, isAsync, isExported, docComment, kind, className, flowSteps });
                }
                ts.forEachChild(node, visit);
            };
            visit(sourceFile);
        }
    }
    extractCalls(files) {
        for (const filePath of files) {
            const sourceFile = this.program.getSourceFile(filePath);
            if (!sourceFile)
                continue;
            const getEnclosingFunctionId = (node) => {
                let current = node.parent;
                while (current) {
                    if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current) || ts.isArrowFunction(current) || ts.isFunctionExpression(current) || ts.isConstructorDeclaration(current)) {
                        const fn = current;
                        const { line } = sourceFile.getLineAndCharacterOfPosition(fn.getStart());
                        let name = "anonymous";
                        if (ts.isConstructorDeclaration(fn)) {
                            name = "constructor";
                            const cls = fn.parent;
                            if (ts.isClassDeclaration(cls) && cls.name)
                                name = `${cls.name.getText()}.constructor`;
                        }
                        else if (ts.isMethodDeclaration(fn) && fn.name) {
                            name = fn.name.getText();
                            const cls = fn.parent;
                            if (ts.isClassDeclaration(cls) && cls.name)
                                name = `${cls.name.getText()}.${name}`;
                        }
                        else if (ts.isFunctionDeclaration(fn) && fn.name) {
                            name = fn.name.getText();
                        }
                        else if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
                            const p = fn.parent;
                            if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
                                name = p.name.getText();
                            }
                            else if (ts.isPropertyDeclaration(p) && ts.isIdentifier(p.name)) {
                                name = p.name.getText();
                                const cls = p.parent;
                                if (ts.isClassDeclaration(cls) && cls.name)
                                    name = `${cls.name.getText()}.${name}`;
                            }
                            else if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) {
                                name = p.name.getText();
                            }
                            else {
                                current = current.parent;
                                continue;
                            }
                        }
                        return this.makeNodeId(name, filePath, line + 1);
                    }
                    current = current.parent;
                }
                return null;
            };
            const normLow = (p) => path.normalize(p).toLowerCase();
            const visit = (node) => {
                if (ts.isCallExpression(node)) {
                    const callerNodeId = getEnclosingFunctionId(node);
                    if (!callerNodeId || !this.functionMap.has(callerNodeId)) {
                        ts.forEachChild(node, visit);
                        return;
                    }
                    let calleeId = null;
                    try {
                        const symbol = this.checker.getSymbolAtLocation(node.expression);
                        if (symbol) {
                            let resolvedSymbol = symbol;
                            try {
                                resolvedSymbol = this.checker.getAliasedSymbol(symbol);
                            }
                            catch { }
                            const decl = resolvedSymbol.valueDeclaration || resolvedSymbol.declarations?.[0] || symbol.valueDeclaration || symbol.declarations?.[0];
                            if (decl) {
                                const df = decl.getSourceFile();
                                const { line } = df.getLineAndCharacterOfPosition(decl.getStart());
                                const symName = resolvedSymbol.getName() !== "__missing" ? resolvedSymbol.getName() : symbol.getName();
                                const dfLow = normLow(df.fileName);
                                if (this.functionMap.has(this.makeNodeId(symName, df.fileName, line + 1))) {
                                    calleeId = this.makeNodeId(symName, df.fileName, line + 1);
                                }
                                if (!calleeId) {
                                    for (const [id, fn] of this.functionMap) {
                                        const mp = fn.name.includes(".") ? fn.name.split(".").pop() : fn.name;
                                        if (normLow(fn.filePath) === dfLow && mp === symName && fn.line === line + 1) {
                                            calleeId = id;
                                            break;
                                        }
                                    }
                                }
                                if (!calleeId) {
                                    for (const [id, fn] of this.functionMap) {
                                        const mp = fn.name.includes(".") ? fn.name.split(".").pop() : fn.name;
                                        if (normLow(fn.filePath) === dfLow && mp === symName) {
                                            calleeId = id;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch { }
                    if (!calleeId && ts.isPropertyAccessExpression(node.expression)) {
                        const propName = node.expression.name.text;
                        const callerFn = this.functionMap.get(callerNodeId);
                        const callerFileLow = normLow(callerFn.filePath);
                        const hits = [];
                        for (const [id, fn] of this.functionMap) {
                            const mp = fn.name.includes(".") ? fn.name.split(".").pop() : fn.name;
                            if (mp === propName)
                                hits.push(id);
                        }
                        if (hits.length === 1) {
                            calleeId = hits[0];
                        }
                        else if (hits.length > 1) {
                            const external = hits.filter(id => normLow(this.functionMap.get(id).filePath) !== callerFileLow);
                            calleeId = external.length > 0 ? external[0] : hits[0];
                        }
                    }
                    if (!calleeId && ts.isIdentifier(node.expression)) {
                        const fnName = node.expression.text;
                        for (const [id, fn] of this.functionMap) {
                            const base = fn.name.includes(".") ? fn.name.split(".").pop() : fn.name;
                            if (base === fnName) {
                                calleeId = id;
                                break;
                            }
                        }
                    }
                    if (calleeId && calleeId !== callerNodeId) {
                        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                        const args = node.arguments.map(a => { try {
                            return a.getText().substring(0, 40);
                        }
                        catch {
                            return "...";
                        } });
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
exports.TypeScriptAnalyzer = TypeScriptAnalyzer;
//# sourceMappingURL=analyzer.js.map