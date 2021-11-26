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

        case "toggle":
          this.toggleTodo(document, e.id);
          return;

        case "save":
          document.save();
          return;
      }
    });

    updateWebview();
  }

  private async addTodo(document: vscode.TextDocument) {
    let blankIndex = this.getNextBlankLineIndex(document);

    if (blankIndex === document.lineCount) {
      await this.addNewLineAtIndex(document, blankIndex);
    }

    await this.updateLineInTextDocument(document, " - [-]()()", blankIndex);
  }

  private removeTodo(document: vscode.TextDocument, id: string) {
    const index = this.getIndexFromId(document, id);

    this.updateLineInTextDocument(document, "", index);
  }

  private toggleTodo(document: vscode.TextDocument, id: string) {
    const text = document.getText();

    let index = this.getIndexFromId(document, id);

    let line = text.split("\n")[index];

    if (line.match("[x]")) {
      line = line.replace("[x]", "[-]");
    } else if (line.match("[?]")) {
      line = line.replace("[?]", "[x]");
    } else if (line.match("[-]")) {
      line = line.replace("[-]", "[?]");
    }

    this.updateLineInTextDocument(document, line, index);
  }

  private getIndexFromId(document: vscode.TextDocument, id: string) {
    let i = parseInt(id);

    if (document.lineAt(i).isEmptyOrWhitespace) {
      for (; i < document.lineCount; i++) {
        console.log(document.lineAt(i));
        if (!document.lineAt(i).isEmptyOrWhitespace) {
          break;
        }
      }
    }

    return i;
  }

  private getNextBlankLineIndex(document: vscode.TextDocument) {
    for (let i = 0; i < document.lineCount; i++) {
      if (document.lineAt(i).isEmptyOrWhitespace) {
        return i;
      }
    }

    return document.lineCount;
  }

  private async addNewLineAtIndex(document: vscode.TextDocument, line: number) {
    const edit = new vscode.WorkspaceEdit();

    if (line === document.lineCount) {
      line = document.lineCount - 1;
    }

    edit.insert(
      document.uri,
      new vscode.Position(line, document.lineAt(line).text.length),
      "\n"
    );

    return await vscode.workspace.applyEdit(edit);
  }

  private async updateLineInTextDocument(
    document: vscode.TextDocument,
    text: string,
    index: number
  ) {
    const edit = new vscode.WorkspaceEdit();

    edit.replace(
      document.uri,
      new vscode.Range(index, 0, index, document.lineAt(index).text.length),
      text
    );

    return await vscode.workspace.applyEdit(edit);
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

    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "node_modules",
        "@vscode/codicons",
        "dist",
        "codicon.css"
      )
    );
    const nonce = getNonce();

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource};img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				  <meta name="viewport" content="width=device-width, initial-scale=1.0">

          <link href="${styleResetUri}" rel="stylesheet" />
          <link href="${styleVSCodeUri}" rel="stylesheet" />
          <link href="${styleMainUri}" rel="stylesheet" />
          <link href="${codiconsUri}" rel="stylesheet" />

          <title>Todo File Manager</title>
        </head>
        <body>
          <div id="todo-file-root"></div>
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }
}
