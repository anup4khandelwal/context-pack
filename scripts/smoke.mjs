import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const repoRoot = process.cwd();
const fixture = path.join(repoRoot, "tests", "fixtures", "simple-repo");
const outputDir = path.join(fixture, ".context-pack");

execSync(`node ${path.join(repoRoot, "dist", "index.js")} bundle --task "test bundle" --repo "${fixture}" --budget 500`, {
  stdio: "inherit",
});

const bundlePath = path.join(outputDir, "bundle.md");
if (!fs.existsSync(bundlePath)) {
  throw new Error("Smoke test failed: bundle.md not created");
}

console.log("Smoke test passed");
