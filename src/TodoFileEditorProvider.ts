import * as vscode from "vscode";
import { getNonce } from "./util";

export class TodoFileEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = "TodoCustoms.TodoFileManager";

  public static register(context: vscode.ExtensionContext) {
    const provider = new TodoFileEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      TodoFileEditorProvider.viewType,
      provider
    );
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: "update",
        text: document.getText(),
      });
    }

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          updateWebview();
        }
      }
    );

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage((e) => {
      switch (e.type) {
        case "add":
          this.addTodo(document);
          return;

        case "remove":
          this.removeTodo(document, e.id);
          return;
      }
    });

    updateWebview();
  }

  private addTodo(document: vscode.TextDocument) {
    // TODO: Add a TODO
    const text = "";

    this.updateTextDocument(document, text);
  }

  private removeTodo(document: vscode.TextDocument, id: string) {
    // TODO: Remove a TODO
    const text = "";

    this.updateTextDocument(document, text);
  }

  private updateTextDocument(document: vscode.TextDocument, text: any) {
    const edit = new vscode.WorkspaceEdit();

    // TODO: Add document partial editing

    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      text
    );

    return vscode.workspace.applyEdit(edit);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "index.js")
    );

    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "reset.css")
    );

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "vscode.css")
    );

    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "style.css")
    );

    const nonce = getNonce();

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				  <meta name="viewport" content="width=device-width, initial-scale=1.0">

          <link href="${styleResetUri}" rel="stylesheet" />
          <link href="${styleVSCodeUri}" rel="stylesheet" />
          <link href="${styleMainUri}" rel="stylesheet" />

          <title>Todo File Manager</title>
        </head>
        <body>
          <h1>TODOs:</h1>
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }
}
