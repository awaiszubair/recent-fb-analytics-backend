import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";
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
        } else if (message.command === "generateFlowchart") {
          this._handleGenerateFlowchart(message.node);
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

  private async _handleGenerateFlowchart(node: any) {
    const config = vscode.workspace.getConfiguration('codeflow');
    const apiKey = config.get<string>('groqApiKey');

    if (!apiKey) {
      this._panel.webview.postMessage({
        command: 'flowchartResult',
        error: 'Groq API Key not set. Please set "codeflow.groqApiKey" in your VS Code settings.'
      });
      return;
    }

    try {
      const uri = vscode.Uri.file(node.filePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      const startLine = Math.max(0, node.line - 1);
      
      // Read ~150 lines starting from the function to capture the body safely
      const endLine = Math.min(doc.lineCount - 1, startLine + 150);
      const codeSnippet = doc.getText(new vscode.Range(startLine, 0, endLine, Number.MAX_VALUE));

      const prompt = `You are an expert developer. Read this TypeScript code and generate a Mermaid.js flowchart (graph TD) that represents ONLY the actual business logic of the "${node.name}" function.

RULES:
1. Output ONLY valid Mermaid code. Do NOT wrap it in markdown code blocks (\`\`\`mermaid).
2. Focus on the core logic (conditions, loops, important service calls).
3. Completely ignore wrapper functions (e.g. 'this.run(', 'async () => {'). Assume the inner logic IS the function.
4. Keep node labels short and concise.

CODE:
${codeSnippet}`;

      const payload = JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      });

      const options = {
        hostname: 'api.groq.com',
        port: 443,
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            this._panel.webview.postMessage({ command: 'flowchartResult', error: `API returned ${res.statusCode}: ${body}` });
            return;
          }
          try {
            const json = JSON.parse(body);
            let mermaidCode = json.choices[0].message.content.trim();
            // Clean markdown blocks if the LLM adds them despite the prompt
            if (mermaidCode.startsWith('```mermaid')) mermaidCode = mermaidCode.substring(10);
            if (mermaidCode.startsWith('```')) mermaidCode = mermaidCode.substring(3);
            if (mermaidCode.endsWith('```')) mermaidCode = mermaidCode.substring(0, mermaidCode.length - 3);
            
            this._panel.webview.postMessage({ command: 'flowchartResult', mermaidCode: mermaidCode.trim() });
          } catch (e: any) {
             this._panel.webview.postMessage({ command: 'flowchartResult', error: `Failed to parse response: ${e.message}` });
          }
        });
      });

      req.on('error', (e: any) => {
        this._panel.webview.postMessage({ command: 'flowchartResult', error: `HTTP Error: ${e.message}` });
      });

      req.write(payload);
      req.end();

    } catch (err: any) {
      this._panel.webview.postMessage({
        command: 'flowchartResult',
        error: `Failed to read file: ${err.message}`
      });
    }
  }
}
