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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const graphPanel_1 = require("./graphPanel");
const analyzer_1 = require("./analyzer");
function activate(context) {
    console.log("CodeFlow Visualizer is now active!");
    // Command: Show graph for the entire workspace
    const showGraphCmd = vscode.commands.registerCommand("codeflow.showGraph", async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage("CodeFlow: No workspace folder found. Please open a project folder.");
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "CodeFlow: Analyzing project...",
            cancellable: false,
        }, async (progress) => {
            progress.report({ increment: 10, message: "Scanning files..." });
            const rootPath = workspaceFolders[0].uri.fsPath;
            const analyzer = new analyzer_1.TypeScriptAnalyzer(rootPath);
            progress.report({ increment: 40, message: "Building call graph..." });
            const graphData = await analyzer.analyzeProject();
            progress.report({
                increment: 40,
                message: "Rendering diagram...",
            });
            graphPanel_1.CodeFlowPanel.createOrShow(context, graphData, "Workspace");
        });
    });
    // Command: Show graph for the currently open file only
    const showGraphForFileCmd = vscode.commands.registerCommand("codeflow.showGraphForFile", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("CodeFlow: No active file. Open a TypeScript or JavaScript file first.");
            return;
        }
        const filePath = editor.document.uri.fsPath;
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const rootPath = workspaceFolders
            ? workspaceFolders[0].uri.fsPath
            : filePath;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "CodeFlow: Analyzing file...",
            cancellable: false,
        }, async (progress) => {
            progress.report({ increment: 20, message: "Parsing AST..." });
            const analyzer = new analyzer_1.TypeScriptAnalyzer(rootPath);
            progress.report({
                increment: 50,
                message: "Building call graph...",
            });
            const graphData = await analyzer.analyzeFile(filePath);
            progress.report({ increment: 30, message: "Rendering..." });
            const fileName = filePath.split(/[\\/]/).pop() || "Unknown File";
            graphPanel_1.CodeFlowPanel.createOrShow(context, graphData, fileName);
        });
    });
    context.subscriptions.push(showGraphCmd, showGraphForFileCmd);
    // Auto-refresh when the panel requests to navigate to a file
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        // Panel handles its own state
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map