import fs from "node:fs";
import path from "node:path";

export type BundleJson = {
  task: string;
  budget: number;
  estimatedTokens: number;
  filesIncluded: number;
  filesSkipped: number;
  files: Array<{
    path: string;
    score: number;
    reasons: string[];
    scoreBreakdown: Array<{ label: string; score: number }>;
    estimatedTokens: number;
    sizeBytes: number;
    mode: string;
  }>;
};

export function writeExplainMarkdown(bundlePath: string, outPath: string): void {
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Bundle JSON not found: ${bundlePath}`);
  }

  const raw = fs.readFileSync(bundlePath, "utf8");
  const bundle = JSON.parse(raw) as BundleJson;
  const totalIncluded = bundle.files.length;
  const totalSkipped = bundle.filesSkipped;

  const lines: string[] = [];
  lines.push("# context-pack explain");
  lines.push("");
  lines.push(`Task: ${bundle.task}`);
  lines.push(`Budget: ${bundle.budget}`);
  lines.push(`Estimated tokens: ${bundle.estimatedTokens}`);
  lines.push(`Files included: ${bundle.filesIncluded}`);
  lines.push(`Files skipped: ${totalSkipped}`);
  lines.push("");

  lines.push("## File explanations");
  bundle.files.forEach((file, index) => {
    lines.push(`### ${index + 1}. ${file.path}`);
    lines.push(`Score: ${file.score}`);
    lines.push(`Mode: ${file.mode}`);
    if (file.reasons.length > 0) {
      lines.push("Reasons:");
      for (const reason of file.reasons) {
        lines.push(`- ${reason}`);
      }
    } else {
      lines.push("Reasons: selected by ranking");
    }
    if (file.scoreBreakdown.length > 0) {
      lines.push("Score breakdown:");
      for (const item of file.scoreBreakdown) {
        lines.push(`- ${item.label}: +${item.score}`);
      }
    }
    const rankedAbove = totalIncluded - index - 1;
    lines.push(`Ranked above ${rankedAbove} included files due to higher score order.`);
    lines.push(`Selected before ${totalSkipped} skipped files because budget would have been exceeded.`);
    lines.push("Heuristics triggered: " + (file.reasons.length > 0 ? file.reasons.join(", ") : "ranking only"));
    lines.push("");
  });

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}

export function defaultExplainPath(bundleJsonPath: string): string {
  return path.join(path.dirname(bundleJsonPath), "explain.md");
}
