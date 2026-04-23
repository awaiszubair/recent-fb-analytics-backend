import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { GraphData } from "./analyzer";

export class CodeFlowPanel {
  public static currentPanel: CodeFlowPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _context: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    context: vscode.ExtensionContext,
    graphData: GraphData,
    title: string
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    if (CodeFlowPanel.currentPanel) {
      CodeFlowPanel.currentPanel._panel.reveal(column);
      CodeFlowPanel.currentPanel._update(graphData, title);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "codeflowGraph",
      `CodeFlow: ${title}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "media")),
        ],
      }
    );

    CodeFlowPanel.currentPanel = new CodeFlowPanel(panel, context);
    CodeFlowPanel.currentPanel._update(graphData, title);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._context = context;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === "openFile") {
          const uri = vscode.Uri.file(message.filePath);
          const doc = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
          const line = Math.max(0, (message.line || 1) - 1);
          const range = editor.document.lineAt(line).range;
          editor.selection = new vscode.Selection(range.start, range.start);
          editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        }
      },
      null,
      this._disposables
    );
  }

  private _update(graphData: GraphData, title: string) {
    this._panel.title = `CodeFlow: ${title}`;
    this._panel.webview.html = this._getHtml(graphData);
  }

  private _getHtml(graphData: GraphData): string {
    const mediaPath = path.join(this._context.extensionPath, "media");
    const htmlPath = path.join(mediaPath, "index.html");
    let html = fs.readFileSync(htmlPath, "utf8");
    const safeData = JSON.stringify(graphData).replace(/</g, "\\u003c");
    html = html.replace("__GRAPH_DATA__", safeData);
    return html;
  }

  public dispose() {
    CodeFlowPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }
}
