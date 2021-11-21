import * as vscode from "vscode";
import { TodoFileEditorProvider } from "./TodoFileEditorProvider";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(TodoFileEditorProvider.register(context));
}
