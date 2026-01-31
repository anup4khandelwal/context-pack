#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

import { loadRules } from "./config.js";
import { scanRepo } from "./scanRepo.js";
import { rankFiles } from "./rankFiles.js";
import { buildBundle, ensureDir, writeBundleJson, writeBundleMarkdown } from "./bundleWriter.js";
import { defaultExplainPath, writeExplainMarkdown } from "./explainWriter.js";

const DEFAULT_OUTPUT_DIR = ".context-pack";

function resolveRepo(repo?: string): string {
  return path.resolve(repo ?? process.cwd());
}

function resolveOutDir(repoPath: string): string {
  return path.join(repoPath, DEFAULT_OUTPUT_DIR);
}

function parseBudget(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const value = Number.parseInt(input, 10);
  return Number.isFinite(value) ? value : fallback;
}

export function buildCli() {
  const program = new Command();

  program.name("context-pack").description("Generate task-specific context bundles for Claude Code / Codex.");

  program
    .command("bundle")
    .requiredOption("--task <task>", "Task description")
    .option("--repo <path>", "Repository path", process.cwd())
    .option("--budget <tokens>", "Token budget")
    .option("--rules <path>", "Rules JSON file")
    .option("--include-tests", "Include test files")
    .action((options: { task: string; repo: string; budget?: string; rules?: string; includeTests?: boolean }) => {
      const repoPath = resolveRepo(options.repo);
      const rules = loadRules(options.rules);
      const budget = parseBudget(options.budget, rules.budget.defaultTokens);

      const entries = scanRepo(repoPath, rules, Boolean(options.includeTests));
      const ranked = rankFiles(repoPath, options.task, entries, rules);
      const bundle = buildBundle(repoPath, options.task, ranked, budget, rules);

      const outDir = resolveOutDir(repoPath);
      ensureDir(outDir);
      writeBundleMarkdown(bundle, path.join(outDir, "bundle.md"));
      writeBundleJson(bundle, path.join(outDir, "bundle.json"));
      writeExplainMarkdown(path.join(outDir, "bundle.json"), path.join(outDir, "explain.md"));

      console.log(`Wrote bundle to ${outDir}`);
    });

  program
    .command("scan")
    .requiredOption("--task <task>", "Task description")
    .option("--repo <path>", "Repository path", process.cwd())
    .option("--rules <path>", "Rules JSON file")
    .option("--limit <count>", "Limit output", "50")
    .option("--include-tests", "Include test files")
    .action(
      (options: {
        task: string;
        repo: string;
        rules?: string;
        limit: string;
        includeTests?: boolean;
      }) => {
        const repoPath = resolveRepo(options.repo);
        const rules = loadRules(options.rules);
        const limit = Number.parseInt(options.limit, 10);

        const entries = scanRepo(repoPath, rules, Boolean(options.includeTests));
        const ranked = rankFiles(repoPath, options.task, entries, rules);

        console.log(`Top ${Number.isFinite(limit) ? limit : 50} files:`);
        for (const file of ranked.slice(0, Number.isFinite(limit) ? limit : 50)) {
          const reason = file.reasons.length > 0 ? file.reasons.join("; ") : "selected by ranking";
          console.log(`- ${file.path} | score=${file.score} | ${reason}`);
        }
      }
    );

  program
    .command("explain")
    .option("--repo <path>", "Repository path", process.cwd())
    .option("--bundle <path>", "Bundle JSON path")
    .action((options: { repo: string; bundle?: string }) => {
      const repoPath = resolveRepo(options.repo);
      const bundlePath = options.bundle ?? path.join(resolveOutDir(repoPath), "bundle.json");
      const explainPath = defaultExplainPath(bundlePath);
      writeExplainMarkdown(bundlePath, explainPath);
      console.log(`Wrote explain to ${explainPath}`);
    });

  return program;
}

export function main(argv = process.argv): void {
  const program = buildCli();
  program.parse(argv);
}

const cliPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(cliPath)) {
  main();
}
