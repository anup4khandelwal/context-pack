import fs from "node:fs";
import path from "node:path";

import type { RulesConfig } from "./config.js";
import type { RankedFile } from "./rankFiles.js";
import { estimateTokens } from "./tokenEstimate.js";
import { isProbablyText } from "./rankFiles.js";

export type BundleFile = {
  path: string;
  score: number;
  reasons: string[];
  scoreBreakdown: Array<{ label: string; score: number }>;
  estimatedTokens: number;
  sizeBytes: number;
  mode: "full" | "trimmed" | "signature";
  content: string;
};

export type BundleResult = {
  task: string;
  budget: number;
  files: BundleFile[];
  estimatedTokens: number;
  skippedFiles: number;
};

const LANGUAGE_BY_EXT: Record<string, string> = {
  ".ts": "ts",
  ".tsx": "tsx",
  ".js": "js",
  ".jsx": "jsx",
  ".json": "json",
  ".md": "md",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
  ".py": "py",
  ".go": "go",
  ".rs": "rs",
  ".java": "java",
  ".kt": "kt",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".hpp": "cpp",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".sql": "sql",
  ".sh": "bash",
  ".rb": "rb",
  ".php": "php",
  ".swift": "swift",
};

function guessLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_BY_EXT[ext] ?? "text";
}

function extractSignature(filePath: string, content: string, rules: RulesConfig): string {
  const ext = path.extname(filePath).toLowerCase();
  const lines = content.split(/\r?\n/);
  const picked: string[] = [];

  const patterns: RegExp[] = [];
  const group = (() => {
    if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "ts";
    if (ext === ".py") return "py";
    if (ext === ".go") return "go";
    if (ext === ".rs") return "rs";
    if (ext === ".java") return "java";
    if (ext === ".kt") return "kt";
    return "default";
  })();

  const patternStrings = rules.files.signaturePatterns[group] ?? [];
  for (const pattern of patternStrings) {
    patterns.push(new RegExp(pattern));
  }

  for (const line of lines) {
    if (patterns.length === 0 || patterns.some((pattern) => pattern.test(line))) {
      picked.push(line.trim());
    }
    if (picked.length >= rules.budget.signatureMaxLines) {
      break;
    }
  }

  if (picked.length === 0) {
    return lines.slice(0, rules.budget.signatureMaxLines).join("\n");
  }

  return picked.join("\n");
}

function sectionOverhead(pathLabel: string, reasons: string[], rules: RulesConfig): number {
  const reasonText = reasons.length > 0 ? reasons.join("; ") : "selected by ranking";
  const header = `## ${pathLabel}\nReason: ${reasonText}\n`;
  const fence = "```\n\n```\n";
  return estimateTokens(header + fence, rules);
}

export function buildBundle(
  repoPath: string,
  task: string,
  ranked: RankedFile[],
  budget: number,
  rules: RulesConfig
): BundleResult {
  const files: BundleFile[] = [];
  let totalTokens = 0;
  let skipped = 0;

  for (const file of ranked) {
    const relPath = path.relative(repoPath, file.path).replaceAll(path.sep, "/");

    if (!isProbablyText(file.path, rules.limits.binarySampleBytes, rules)) {
      skipped += 1;
      continue;
    }

    const content = fs.readFileSync(file.path, "utf8");
    const overheadTokens = sectionOverhead(relPath, file.reasons, rules);

    const fullTokens = estimateTokens(content, rules) + overheadTokens;
    const trimmedContent = content.slice(0, rules.budget.trimChars);
    const trimmedTokens = estimateTokens(trimmedContent, rules) + overheadTokens;
    const signatureContent = extractSignature(file.path, content, rules);
    const signatureTokens = estimateTokens(signatureContent, rules) + overheadTokens;

    const remaining = budget - totalTokens;
    let mode: BundleFile["mode"] | null = null;
    let selectedContent = "";
    let selectedTokens = 0;

    if (fullTokens <= remaining && fullTokens <= rules.budget.maxFileTokens) {
      mode = "full";
      selectedContent = content;
      selectedTokens = fullTokens;
    } else if (trimmedTokens <= remaining) {
      mode = "trimmed";
      selectedContent = trimmedContent;
      selectedTokens = trimmedTokens;
    } else if (signatureTokens <= remaining) {
      mode = "signature";
      selectedContent = signatureContent;
      selectedTokens = signatureTokens;
    }

    if (!mode) {
      skipped += 1;
      continue;
    }

    files.push({
      path: relPath,
      score: file.score,
      reasons: file.reasons,
      scoreBreakdown: file.scoreBreakdown,
      estimatedTokens: selectedTokens,
      sizeBytes: file.sizeBytes,
      mode,
      content: selectedContent,
    });

    totalTokens += selectedTokens;
    if (totalTokens >= budget) {
      break;
    }
  }

  return { task, budget, files, estimatedTokens: totalTokens, skippedFiles: skipped };
}

export function writeBundleMarkdown(bundle: BundleResult, outPath: string): void {
  const lines: string[] = [];
  lines.push("# context-pack bundle");
  lines.push("");
  lines.push(`Task: ${bundle.task}`);
  lines.push(`Budget: ${bundle.budget}`);
  lines.push(`Estimated tokens: ${bundle.estimatedTokens}`);
  lines.push(`Files included: ${bundle.files.length}`);
  lines.push(`Files skipped: ${bundle.skippedFiles}`);
  lines.push("");

  lines.push("## Index");
  for (const file of bundle.files) {
    const reason = file.reasons.length > 0 ? file.reasons.join("; ") : "selected by ranking";
    lines.push(`- ${file.path} (${file.estimatedTokens} tokens, ${file.mode}) — ${reason}`);
  }
  lines.push("");

  for (const file of bundle.files) {
    const reason = file.reasons.length > 0 ? file.reasons.join("; ") : "selected by ranking";
    lines.push(`## ${file.path}`);
    lines.push(`Reason: ${reason}`);
    lines.push(`Mode: ${file.mode}`);
    lines.push("```" + guessLanguage(file.path));
    lines.push(file.content);
    lines.push("```");
    lines.push("");
  }

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}

export function writeBundleJson(bundle: BundleResult, outPath: string): void {
  const payload = {
    task: bundle.task,
    budget: bundle.budget,
    estimatedTokens: bundle.estimatedTokens,
    filesIncluded: bundle.files.length,
    filesSkipped: bundle.skippedFiles,
    files: bundle.files.map((file) => ({
      path: file.path,
      score: file.score,
      reasons: file.reasons,
      scoreBreakdown: file.scoreBreakdown,
      estimatedTokens: file.estimatedTokens,
      sizeBytes: file.sizeBytes,
      mode: file.mode,
      content: file.content,
    })),
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}
