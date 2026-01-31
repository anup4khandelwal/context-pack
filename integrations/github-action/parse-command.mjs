const input = process.env.COMMENT_BODY ?? process.argv.slice(2).join(" ");

function parseContextPackCommand(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const commandLine = lines.find((line) => line.trim().startsWith("/context-pack"));
  if (!commandLine) return null;

  const taskMatch = commandLine.match(/task="([^"]+)"/);
  if (!taskMatch) return null;

  const budgetMatch = commandLine.match(/budget=(\d+)/);

  return {
    task: taskMatch[1],
    budget: budgetMatch ? Number.parseInt(budgetMatch[1], 10) : null,
  };
}

const result = parseContextPackCommand(input);
if (!result) {
  process.exit(1);
}

const { task, budget } = result;
if (process.env.GITHUB_OUTPUT) {
  const fs = await import("node:fs");
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `task=${task}\n`);
  if (budget) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `budget=${budget}\n`);
  }
} else {
  console.log(JSON.stringify(result));
}
