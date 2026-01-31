import assert from "node:assert/strict";
import { execSync } from "node:child_process";

const run = (body) => {
  const out = execSync(`node integrations/github-action/parse-command.mjs "${body.replace(/"/g, '\\"')}"`, {
    encoding: "utf8",
  }).trim();
  return JSON.parse(out);
};

const result1 = run('/context-pack task="Add pagination" budget=12000');
assert.equal(result1.task, 'Add pagination');
assert.equal(result1.budget, 12000);

const result2 = run('/context-pack task="Fix login"');
assert.equal(result2.task, 'Fix login');
assert.equal(result2.budget, null);

console.log("Comment parser tests passed");
