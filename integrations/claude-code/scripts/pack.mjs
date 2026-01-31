import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

const task = process.argv[2];
const budget = process.argv[3] ?? "14000";

if (!task) {
  console.error('Usage: pack.mjs "<task>" [budget]');
  process.exit(1);
}

const args = ["bundle", "--task", task, "--budget", budget, "--out", ".context-pack"];

async function run() {
  try {
    await execFileAsync("context-pack", args, { cwd: process.cwd() });
  } catch {
    await execFileAsync("npx", ["-y", "context-pack", ...args], { cwd: process.cwd() });
  }
}

await run();
console.error("Bundle ready. Please read .context-pack/bundle.md");
