import * as vscode from "vscode";
import { CodeFlowPanel } from "./graphPanel";
import { TypeScriptAnalyzer } from "./analyzer";

export function activate(context: vscode.ExtensionContext) {
  console.log("CodeFlow Visualizer is now active!");

  // Command: Show graph for the entire workspace
  const showGraphCmd = vscode.commands.registerCommand(
    "codeflow.showGraph",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          "CodeFlow: No workspace folder found. Please open a project folder."
        );
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "CodeFlow: Analyzing project...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 10, message: "Scanning files..." });

          const rootPath = workspaceFolders[0].uri.fsPath;
          const analyzer = new TypeScriptAnalyzer(rootPath);

          progress.report({ increment: 40, message: "Building call graph..." });
          const graphData = await analyzer.analyzeProject();

          progress.report({
            increment: 40,
            message: "Rendering diagram...",
          });
          CodeFlowPanel.createOrShow(context, graphData, "Workspace");
        }
      );
    }
  );

  // Command: Show graph for the currently open file only
  const showGraphForFileCmd = vscode.commands.registerCommand(
    "codeflow.showGraphForFile",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(
          "CodeFlow: No active file. Open a TypeScript or JavaScript file first."
        );
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const rootPath = workspaceFolders
        ? workspaceFolders[0].uri.fsPath
        : filePath;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "CodeFlow: Analyzing file...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 20, message: "Parsing AST..." });
          const analyzer = new TypeScriptAnalyzer(rootPath);

          progress.report({
            increment: 50,
            message: "Building call graph...",
          });
          const graphData = await analyzer.analyzeFile(filePath);

          progress.report({ increment: 30, message: "Rendering..." });
          const fileName =
            filePath.split(/[\\/]/).pop() || "Unknown File";
          CodeFlowPanel.createOrShow(context, graphData, fileName);
        }
      );
    }
  );

  context.subscriptions.push(showGraphCmd, showGraphForFileCmd);

  // Auto-refresh when the panel requests to navigate to a file
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      // Panel handles its own state
    })
  );
}

export function deactivate() {}
