import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import ignore = require("ignore");
import type { Ignore } from "ignore";

import type { RulesConfig } from "./config.js";

export type FileEntry = {
  path: string;
  sizeBytes: number;
};

const GIT_DIR = ".git";
const ignoreFactory: (options?: unknown) => Ignore =
  (ignore as unknown as { default?: (options?: unknown) => Ignore }).default ??
  (ignore as unknown as (options?: unknown) => Ignore);

export function isGitRepo(repoPath: string): boolean {
  if (fs.existsSync(path.join(repoPath, GIT_DIR))) {
    return true;
  }

  const result = spawnSync("git", ["-C", repoPath, "rev-parse", "--is-inside-work-tree"], {
    encoding: "utf8",
  });

  return result.status === 0 && result.stdout.trim() === "true";
}

function gitLsFiles(repoPath: string): string[] {
  const result = spawnSync(
    "git",
    ["-C", repoPath, "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr}`);
  }

  return result.stdout
    .split("\u0000")
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadGitignorePatterns(dirPath: string): string[] {
  const gitignorePath = path.join(dirPath, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return [];
  const content = fs.readFileSync(gitignorePath, "utf8");
  return content.split(/\r?\n/);
}

function toRootRelativePattern(pattern: string, baseDir: string, repoPath: string): string | null {
  if (!pattern || pattern === "/") return null;

  let raw = pattern;
  let negated = false;

  if (raw.startsWith("\\#")) {
    raw = raw.slice(1);
  } else if (raw.startsWith("#")) {
    return null;
  }

  if (raw.startsWith("\\!")) {
    raw = raw.slice(1);
  } else if (raw.startsWith("!")) {
    negated = true;
    raw = raw.slice(1);
  }

  if (!raw) return null;

  const baseRel = path.relative(repoPath, baseDir).replaceAll(path.sep, "/");
  const prefix = baseRel ? `${baseRel}/` : "";

  if (raw.startsWith("/")) {
    const normalized = `${prefix}${raw.slice(1)}`;
    return negated ? `!${normalized}` : normalized;
  }

  if (raw.includes("/")) {
    const normalized = `${prefix}${raw}`;
    return negated ? `!${normalized}` : normalized;
  }

  const normalized = `${prefix}**/${raw}`;
  return negated ? `!${normalized}` : normalized;
}

function buildIgnoreForDir(
  repoPath: string,
  dirPath: string,
  parentPatterns: string[],
  localPatterns: string[]
): { ig: Ignore; combinedPatterns: string[] } {
  const ig = ignoreFactory();
  const combinedPatterns = [...parentPatterns];
  if (parentPatterns.length > 0) {
    ig.add(parentPatterns);
  }
  for (const pattern of localPatterns) {
    const converted = toRootRelativePattern(pattern.trim(), dirPath, repoPath);
    if (converted) {
      ig.add(converted);
      combinedPatterns.push(converted);
    }
  }
  return { ig, combinedPatterns };
}

function shouldTraverseIgnoredDir(relPath: string, patterns: string[]) {
  const normalized = relPath.endsWith("/") ? relPath : `${relPath}/`;
  for (const pattern of patterns) {
    if (!pattern.startsWith("!")) continue;
    const unignored = pattern.slice(1);
    if (unignored.startsWith(normalized) || unignored.startsWith(relPath)) {
      return true;
    }
  }
  return false;
}

function walkFiles(repoPath: string, rules: RulesConfig, includeTests: boolean): string[] {
  const results: string[] = [];
  const stack: Array<{ dir: string; patterns: string[] }> = [{ dir: repoPath, patterns: [] }];

  const defaultIgnore = ignoreFactory().add(rules.ignore.default);
  const testIgnore = includeTests ? ignoreFactory() : ignoreFactory().add(rules.ignore.tests);

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) continue;

    const { dir, patterns: parentPatterns } = item;
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) continue;

    const base = path.basename(dir);
    if (base === GIT_DIR) continue;

    const localPatterns = loadGitignorePatterns(dir);
    const { ig: currentIgnore, combinedPatterns: currentPatterns } = buildIgnoreForDir(
      repoPath,
      dir,
      parentPatterns,
      localPatterns
    );

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const rel = path.relative(repoPath, fullPath).replaceAll(path.sep, "/");

      if (defaultIgnore.ignores(rel) || testIgnore.ignores(rel)) {
        continue;
      }

      const entryStat = fs.statSync(fullPath);
      if (entryStat.isDirectory()) {
        if (currentIgnore.ignores(rel) && !shouldTraverseIgnoredDir(rel, currentPatterns)) {
          continue;
        }
        stack.push({ dir: fullPath, patterns: currentPatterns });
      } else if (entryStat.isFile()) {
        if (currentIgnore.ignores(rel)) {
          continue;
        }
        results.push(fullPath);
      }
    }
  }

  return results.sort();
}

export function scanRepo(
  repoPath: string,
  rules: RulesConfig,
  includeTests: boolean
): FileEntry[] {
  const resolved = path.resolve(repoPath);
  let files: string[] = [];

  const defaultIgnore = ignoreFactory().add(rules.ignore.default);
  const testIgnore = includeTests ? ignoreFactory() : ignoreFactory().add(rules.ignore.tests);

  if (isGitRepo(resolved)) {
    files = gitLsFiles(resolved)
      .map((file) => path.join(resolved, file))
      .filter((file) => {
        const rel = path.relative(resolved, file).replaceAll(path.sep, "/");
        return !defaultIgnore.ignores(rel) && !testIgnore.ignores(rel);
      })
      .sort();
  } else {
    files = walkFiles(resolved, rules, includeTests);
  }

  const entries: FileEntry[] = [];
  for (const file of files.slice(0, rules.limits.maxFiles)) {
    try {
      const stat = fs.statSync(file);
      entries.push({ path: file, sizeBytes: stat.size });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  return entries;
}
