import * as vscode from "vscode";
import { execFile } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";

const outputChannel = vscode.window.createOutputChannel("Context Pack");

function execCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    outputChannel.appendLine(`> ${command} ${args.join(" ")}`);
    execFile(command, args, { cwd }, (error, stdout, stderr) => {
      if (stdout) outputChannel.appendLine(stdout);
      if (stderr) outputChannel.appendLine(stderr);
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function runContextPack(task: string, budget: number, workspaceRoot: string) {
  const args = [
    "bundle",
    "--task",
    task,
    "--budget",
    String(budget),
    "--out",
    ".context-pack",
  ];

  try {
    await execCommand("context-pack", args, workspaceRoot);
  } catch {
    await execCommand("npx", ["-y", "context-pack", ...args], workspaceRoot);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("context-pack.generateBundle", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("Open a workspace to run Context Pack.");
      return;
    }

    const task = await vscode.window.showInputBox({
      prompt: "Describe the task for context-pack",
      ignoreFocusOut: true,
    });

    if (!task) {
      return;
    }

    const budgetInput = await vscode.window.showInputBox({
      prompt: "Token budget (default 14000)",
      value: "14000",
      ignoreFocusOut: true,
    });

    const budget = budgetInput ? Number.parseInt(budgetInput, 10) : 14000;
    if (!Number.isFinite(budget)) {
      vscode.window.showErrorMessage("Invalid budget value.");
      return;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;
    outputChannel.show(true);

    try {
      await runContextPack(task, budget, workspaceRoot);
      const bundlePath = path.join(workspaceRoot, ".context-pack", "bundle.md");
      const bundle = fs.readFileSync(bundlePath, "utf8");
      await vscode.env.clipboard.writeText(bundle);
      vscode.window.showInformationMessage(
        `Context Pack generated (budget ${budget}). Bundle copied to clipboard.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Context Pack failed: ${message}`);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
  outputChannel.dispose();
}
