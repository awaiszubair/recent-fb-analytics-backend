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
        // Build the full project program so cross-file symbol resolution works
        this.buildProgram(allFiles);
        // Extract ALL functions across the project (builds the symbol index)
        this.extractFunctions(allFiles);
        // Extract calls from ALL files so incoming/outgoing cross-file edges are found
        this.extractCalls(allFiles);
        // Filter: case-insensitive path comparison to handle Windows drive letter case
        const normLow = (p) => path.normalize(p).toLowerCase();
        const targetNorm = normLow(filePath);
        // Collect IDs of functions that live in the target file
        const fileFuncIds = new Set();
        for (const [id, node] of this.functionMap) {
            if (normLow(node.filePath) === targetNorm) {
                fileFuncIds.add(id);
            }
        }
        // Keep edges that touch the target file (either caller or callee is in the file)
        const relevantEdges = this.edges.filter((e) => fileFuncIds.has(e.source) || fileFuncIds.has(e.target));
        // Expand node set to include all connected nodes
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
        const excluded = new Set([
            "node_modules",
            "dist",
            "out",
            ".git",
            "coverage",
        ]);
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
                else if ((fullPath.endsWith(".ts") || fullPath.endsWith(".js")) &&
                    !fullPath.endsWith(".d.ts")) {
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
        const nodeStart = node.getFullStart();
        const nodeText = fullText.slice(Math.max(0, nodeStart - 200), node.getStart());
        const jsDocMatch = nodeText.match(/\/\*\*([\s\S]*?)\*\//);
        if (jsDocMatch) {
            return jsDocMatch[1]
                .split("\n")
                .map((l) => l.replace(/^\s*\*\s?/, "").trim())
                .filter(Boolean)
                .join(" ");
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
            let defaultValue;
            if (p.initializer) {
                defaultValue = p.initializer.getText();
            }
            return {
                name,
                type,
                optional: !!p.questionToken || !!p.initializer,
                defaultValue,
            };
        });
    }
    extractFunctions(files) {
        for (const filePath of files) {
            const sourceFile = this.program.getSourceFile(filePath);
            if (!sourceFile)
                continue;
            const fileName = path.basename(filePath);
            const visit = (node) => {
                if (ts.isFunctionDeclaration(node) ||
                    ts.isMethodDeclaration(node) ||
                    ts.isArrowFunction(node) ||
                    ts.isFunctionExpression(node) ||
                    ts.isConstructorDeclaration(node)) {
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
                        isExported =
                            !!fn.modifiers &&
                                fn.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
                    }
                    else if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
                        kind = ts.isArrowFunction(fn) ? "arrow" : "function";
                        // Try to get name from parent variable declaration
                        const parent = fn.parent;
                        if (ts.isVariableDeclaration(parent) &&
                            ts.isIdentifier(parent.name)) {
                            name = parent.name.getText();
                            const varStmt = parent.parent?.parent;
                            if (varStmt &&
                                ts.isVariableStatement(varStmt) &&
                                varStmt.modifiers) {
                                isExported = varStmt.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
                            }
                        }
                        else if (ts.isPropertyDeclaration(parent) &&
                            ts.isIdentifier(parent.name)) {
                            name = parent.name.getText();
                            const classDecl = parent.parent;
                            if (ts.isClassDeclaration(classDecl) && classDecl.name) {
                                className = classDecl.name.getText();
                                name = `${className}.${name}`;
                            }
                        }
                        else if (ts.isPropertyAssignment(parent) &&
                            ts.isIdentifier(parent.name)) {
                            name = parent.name.getText();
                        }
                    }
                    // Get return type
                    let returnType = "void";
                    if (fn.type) {
                        returnType = fn.type.getText();
                    }
                    else {
                        try {
                            const sig = this.checker.getSignatureFromDeclaration(fn);
                            if (sig) {
                                returnType = this.checker.typeToString(sig.getReturnType());
                            }
                        }
                        catch { }
                    }
                    const isAsync = !!fn.modifiers &&
                        fn.modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
                    const id = this.makeNodeId(name, filePath, line + 1);
                    const params = this.extractParamInfo(fn.parameters);
                    const docComment = this.getDocComment(fn);
                    const fnNode = {
                        id,
                        name,
                        filePath,
                        fileName,
                        line: line + 1,
                        column: character + 1,
                        params,
                        returnType,
                        isAsync,
                        isExported,
                        docComment,
                        kind,
                        className,
                    };
                    this.functionMap.set(id, fnNode);
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
            // Build a map of node → enclosing function id
            const getEnclosingFunctionId = (node) => {
                let current = node.parent;
                while (current) {
                    if (ts.isFunctionDeclaration(current) ||
                        ts.isMethodDeclaration(current) ||
                        ts.isArrowFunction(current) ||
                        ts.isFunctionExpression(current) ||
                        ts.isConstructorDeclaration(current)) {
                        const fn = current;
                        const { line } = sourceFile.getLineAndCharacterOfPosition(fn.getStart());
                        // reconstruct name same way as above
                        let name = "anonymous";
                        if (ts.isConstructorDeclaration(fn)) {
                            name = "constructor";
                            const cls = fn.parent;
                            if (ts.isClassDeclaration(cls) && cls.name) {
                                name = `${cls.name.getText()}.constructor`;
                            }
                        }
                        else if (ts.isMethodDeclaration(fn) && fn.name) {
                            name = fn.name.getText();
                            const cls = fn.parent;
                            if (ts.isClassDeclaration(cls) && cls.name) {
                                name = `${cls.name.getText()}.${name}`;
                            }
                        }
                        else if (ts.isFunctionDeclaration(fn) && fn.name) {
                            name = fn.name.getText();
                        }
                        else if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
                            const p = fn.parent;
                            if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
                                name = p.name.getText();
                            }
                            else if (ts.isPropertyDeclaration(p) &&
                                ts.isIdentifier(p.name)) {
                                name = p.name.getText();
                                const cls = p.parent;
                                if (ts.isClassDeclaration(cls) && cls.name) {
                                    name = `${cls.name.getText()}.${name}`;
                                }
                            }
                            else if (ts.isPropertyAssignment(p) &&
                                ts.isIdentifier(p.name)) {
                                name = p.name.getText();
                            }
                            else {
                                // It is an anonymous callback! Skip it and keep looking up.
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
                    // ── Tier A: TypeScript symbol resolution ─────────────────────────
                    try {
                        const symbol = this.checker.getSymbolAtLocation(node.expression);
                        if (symbol) {
                            let resolvedSymbol = symbol;
                            try {
                                resolvedSymbol = this.checker.getAliasedSymbol(symbol);
                            }
                            catch { }
                            const decl = resolvedSymbol.valueDeclaration ||
                                resolvedSymbol.declarations?.[0] ||
                                symbol.valueDeclaration ||
                                symbol.declarations?.[0];
                            if (decl) {
                                const df = decl.getSourceFile();
                                const { line } = df.getLineAndCharacterOfPosition(decl.getStart());
                                const symName = resolvedSymbol.getName() !== "__missing"
                                    ? resolvedSymbol.getName() : symbol.getName();
                                const dfLow = normLow(df.fileName);
                                // Tier A1: exact ID
                                if (this.functionMap.has(this.makeNodeId(symName, df.fileName, line + 1))) {
                                    calleeId = this.makeNodeId(symName, df.fileName, line + 1);
                                }
                                // Tier A2: same file (case-insensitive) + method name + line
                                if (!calleeId) {
                                    for (const [id, fn] of this.functionMap) {
                                        const methodPart = fn.name.includes('.') ? fn.name.split('.').pop() : fn.name;
                                        if (normLow(fn.filePath) === dfLow && methodPart === symName && fn.line === line + 1) {
                                            calleeId = id;
                                            break;
                                        }
                                    }
                                }
                                // Tier A3: same file (case-insensitive) + method name (no line check)
                                if (!calleeId) {
                                    for (const [id, fn] of this.functionMap) {
                                        const methodPart = fn.name.includes('.') ? fn.name.split('.').pop() : fn.name;
                                        if (normLow(fn.filePath) === dfLow && methodPart === symName) {
                                            calleeId = id;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch { }
                    // ── Tier B: Property-access name fallback ─────────────────────────
                    // e.g.  saveFacebookDataService.createSyncJob(...)
                    //       pageRepository.getAllActivePages()
                    //       this.getWindowStart(...)
                    // Extract the property name from node.expression and search the map.
                    if (!calleeId && ts.isPropertyAccessExpression(node.expression)) {
                        const propName = node.expression.name.text; // raw method name, e.g. "createSyncJob"
                        const callerFn = this.functionMap.get(callerNodeId);
                        const callerFileLow = normLow(callerFn.filePath);
                        // Collect all functions whose method part matches
                        const hits = [];
                        for (const [id, fn] of this.functionMap) {
                            const methodPart = fn.name.includes('.') ? fn.name.split('.').pop() : fn.name;
                            if (methodPart === propName)
                                hits.push(id);
                        }
                        if (hits.length === 1) {
                            // Unambiguous — use it
                            calleeId = hits[0];
                        }
                        else if (hits.length > 1) {
                            // Prefer functions NOT in the same file (external service calls)
                            const external = hits.filter(id => normLow(this.functionMap.get(id).filePath) !== callerFileLow);
                            calleeId = external.length > 0 ? external[0] : hits[0];
                        }
                    }
                    // ── Tier C: Plain identifier fallback ────────────────────────────
                    // e.g.  decryptPageToken(...)
                    if (!calleeId && ts.isIdentifier(node.expression)) {
                        const fnName = node.expression.text;
                        for (const [id, fn] of this.functionMap) {
                            const baseName = fn.name.includes('.') ? fn.name.split('.').pop() : fn.name;
                            if (baseName === fnName) {
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