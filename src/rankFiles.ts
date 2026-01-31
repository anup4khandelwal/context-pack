import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { RulesConfig } from "./config.js";
import type { FileEntry } from "./scanRepo.js";
import { isGitRepo } from "./scanRepo.js";

export type RankedFile = FileEntry & {
  score: number;
  reasons: string[];
  scoreBreakdown: Array<{ label: string; score: number }>;
};

export function isProbablyText(filePath: string, sampleBytes: number, rules: RulesConfig): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (rules.files.textExtensions.includes(ext)) return true;

  try {
    const buffer = fs.readFileSync(filePath, { encoding: null, flag: "r" });
    const sample = buffer.subarray(0, sampleBytes);
    for (const byte of sample) {
      if (byte === 0) return false;
    }
  } catch {
    return false;
  }

  return true;
}

function splitCamelCase(token: string): string[] {
  return token
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function tokenizeTask(task: string): string[] {
  const matches = task.toLowerCase().match(/[a-z0-9_]+/g);
  if (!matches) return [];
  const tokens = new Set<string>();
  for (const token of matches) {
    if (token.length >= 2) tokens.add(token);
    for (const part of splitCamelCase(token)) {
      if (part.length >= 2) tokens.add(part);
    }
  }
  return Array.from(tokens);
}

function stripComments(content: string, ext: string): string {
  if (ext === ".py") {
    return content.replace(/#.*$/gm, "");
  }
  if (ext === ".go" || ext === ".rs" || ext === ".java" || ext === ".kt") {
    return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  }
  return content;
}

type CommitEntry = {
  files: string[];
};

function loadGitCommits(repoPath: string, rules: RulesConfig): CommitEntry[] {
  if (!isGitRepo(repoPath)) return [];

  const result = spawnSync(
    "git",
    ["-C", repoPath, "log", `-n`, `${rules.limits.maxCommits}`, "--name-only", "--pretty=format:%H"],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    return [];
  }

  const commits: CommitEntry[] = [];
  let current: CommitEntry | null = null;

  for (const line of result.stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[a-f0-9]{7,40}$/.test(trimmed)) {
      if (current) commits.push(current);
      current = { files: [] };
      continue;
    }
    if (!current) current = { files: [] };
    current.files.push(path.normalize(trimmed));
  }
  if (current) commits.push(current);

  return commits;
}

function buildGitHistory(commits: CommitEntry[]) {
  const history = new Map<string, number>();
  for (const commit of commits) {
    for (const file of commit.files) {
      history.set(file, (history.get(file) ?? 0) + 1);
    }
  }
  return history;
}

function parseImports(filePath: string, content: string, extensions: string[]): string[] {
  const ext = path.extname(filePath).toLowerCase();
  if (!extensions.includes(ext)) return [];

  const cleaned = stripComments(content, ext);
  const imports: string[] = [];

  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
    const patterns = [
      /import\s+[^"']*?["']([^"']+)["']/g,
      /export\s+[^"']*?["']([^"']+)["']/g,
      /require\(\s*["']([^"']+)["']\s*\)/g,
      /import\(\s*["']([^"']+)["']\s*\)/g,
    ];
    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(cleaned)) !== null) {
        imports.push(match[1]);
      }
    }
    return imports;
  }

  if (ext === ".py") {
    const fromPattern = /from\s+([.\w]+)\s+import\s+/g;
    const importPattern = /import\s+([a-zA-Z0-9_\.]+)/g;
    let match: RegExpExecArray | null;
    while ((match = fromPattern.exec(cleaned)) !== null) {
      imports.push(match[1]);
    }
    while ((match = importPattern.exec(cleaned)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  if (ext === ".go") {
    const importBlocks = cleaned.match(/import\s+(?:\([\s\S]*?\)|\"[^\"]+\")/g);
    if (importBlocks) {
      for (const block of importBlocks) {
        const matches = block.match(/\"([^\"]+)\"/g) ?? [];
        for (const quoted of matches) {
          imports.push(quoted.replace(/\"/g, ""));
        }
      }
    }
    return imports;
  }

  if (ext === ".rs") {
    const usePattern = /use\s+([a-zA-Z0-9_:\.]+)\s*;/g;
    const modPattern = /mod\s+([a-zA-Z0-9_]+)\s*;/g;
    let match: RegExpExecArray | null;
    while ((match = usePattern.exec(cleaned)) !== null) {
      imports.push(match[1]);
    }
    while ((match = modPattern.exec(cleaned)) !== null) {
      imports.push(`self::${match[1]}`);
    }
    return imports;
  }

  if (ext === ".java" || ext === ".kt") {
    const pattern = /import\s+([a-zA-Z0-9_\.]+)\s*;/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(cleaned)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  return imports;
}

function buildPythonModuleIndex(repoPath: string, files: FileEntry[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const file of files) {
    if (path.extname(file.path) !== ".py") continue;
    const relPath = path.relative(repoPath, file.path).replaceAll(path.sep, "/");
    if (path.basename(relPath) === "__init__.py") {
      const modulePath = path.dirname(relPath).replaceAll("/", ".");
      if (modulePath && !index.has(modulePath)) index.set(modulePath, relPath);
      continue;
    }
    const modulePath = relPath.replace(/\.py$/, "").replaceAll("/", ".");
    if (modulePath && !index.has(modulePath)) index.set(modulePath, relPath);
  }
  return index;
}

function buildRustModuleIndex(repoPath: string, files: FileEntry[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const file of files) {
    if (path.extname(file.path) !== ".rs") continue;
    const relPath = path.relative(repoPath, file.path).replaceAll(path.sep, "/");
    const base = path.basename(relPath);
    if (base === "mod.rs" || base === "lib.rs" || base === "main.rs") {
      const modulePath = path.dirname(relPath).replaceAll("/", ".");
      if (modulePath && !index.has(modulePath)) index.set(modulePath, relPath);
      continue;
    }
    const modulePath = relPath.replace(/\.rs$/, "").replaceAll("/", ".");
    if (modulePath && !index.has(modulePath)) index.set(modulePath, relPath);
  }
  return index;
}

function resolveImport(
  fromFile: string,
  spec: string,
  repoPath: string,
  pythonIndex: Map<string, string>,
  rustIndex: Map<string, string>
): string | null {
  const ext = path.extname(fromFile).toLowerCase();
  const relFrom = path.relative(repoPath, fromFile).replaceAll(path.sep, "/");

  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
    if (!spec.startsWith(".")) return null;
    const baseDir = path.dirname(fromFile);
    const candidate = path.resolve(baseDir, spec);
    const candidates = [candidate];

    if (!path.extname(candidate)) {
      for (const extItem of [".ts", ".tsx", ".js", ".jsx", ".json"]) {
        candidates.push(`${candidate}${extItem}`);
      }
      for (const extItem of [".ts", ".tsx", ".js", ".jsx", ".json"]) {
        candidates.push(path.join(candidate, `index${extItem}`));
      }
    }

    for (const item of candidates) {
      if (fs.existsSync(item)) {
        const rel = path.relative(repoPath, item);
        return path.normalize(rel);
      }
    }
    return null;
  }

  if (ext === ".py") {
    if (spec.startsWith(".")) {
      const dotCount = spec.match(/^\.+/)?.[0].length ?? 0;
      const remainder = spec.slice(dotCount);
      let moduleBase = path.dirname(relFrom).replaceAll("/", ".");
      if (dotCount > 1) {
        const parts = moduleBase.split(".").filter(Boolean);
        moduleBase = parts.slice(0, Math.max(0, parts.length - (dotCount - 1))).join(".");
      }
      const modulePath = remainder ? `${moduleBase}.${remainder}` : moduleBase;
      const resolved = pythonIndex.get(modulePath);
      return resolved ? path.normalize(resolved) : null;
    }
    const resolved = pythonIndex.get(spec);
    return resolved ? path.normalize(resolved) : null;
  }

  if (ext === ".go") {
    if (!spec.startsWith(".")) return null;
    const baseDir = path.dirname(fromFile);
    const candidate = path.resolve(baseDir, spec);
    const candidates = [candidate, `${candidate}.go`, path.join(candidate, "main.go")];
    for (const item of candidates) {
      if (fs.existsSync(item)) {
        return path.normalize(path.relative(repoPath, item));
      }
    }
    return null;
  }

  if (ext === ".rs") {
    let fromModule = relFrom.replace(/\.rs$/, "").replaceAll("/", ".");
    const baseName = path.basename(relFrom);
    if (baseName === "mod.rs" || baseName === "lib.rs" || baseName === "main.rs") {
      fromModule = path.dirname(relFrom).replaceAll("/", ".");
    }
    if (spec.startsWith("crate::")) {
      const module = spec.replace(/^crate::/, "");
      const resolved = rustIndex.get(module);
      return resolved ? path.normalize(resolved) : null;
    }
    if (spec.startsWith("super::")) {
      const remainder = spec.replace(/^super::/, "");
      const parts = fromModule.split(".").filter(Boolean);
      const base = parts.slice(0, Math.max(0, parts.length - 1)).join(".");
      const module = remainder ? `${base}.${remainder}` : base;
      const resolved = rustIndex.get(module);
      return resolved ? path.normalize(resolved) : null;
    }
    if (spec.startsWith("self::")) {
      const remainder = spec.replace(/^self::/, "");
      const module = remainder ? `${fromModule}.${remainder}` : fromModule;
      const resolved = rustIndex.get(module);
      return resolved ? path.normalize(resolved) : null;
    }
    return null;
  }

  return null;
}

function buildImportGraph(
  repoPath: string,
  files: FileEntry[],
  contentCache: Map<string, string>,
  rules: RulesConfig,
  pythonIndex: Map<string, string>,
  rustIndex: Map<string, string>
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const extensions = rules.dependency.extensions;

  for (const file of files) {
    const relPath = path.relative(repoPath, file.path);
    const normalized = path.normalize(relPath);
    const ext = path.extname(file.path);
    if (!extensions.includes(ext)) continue;

    const content = contentCache.get(file.path) ?? "";
    const imports = parseImports(file.path, content, extensions);

    for (const spec of imports) {
      const resolved = resolveImport(file.path, spec, repoPath, pythonIndex, rustIndex);
      if (!resolved) continue;

      if (!graph.has(normalized)) graph.set(normalized, new Set());
      if (!graph.has(resolved)) graph.set(resolved, new Set());
      graph.get(normalized)?.add(resolved);
      graph.get(resolved)?.add(normalized);
    }
  }

  return graph;
}

function isStructuralMatch(relPath: string, structuralList: string[]): boolean {
  return structuralList.some((item) => item === relPath);
}

export function rankFiles(
  repoPath: string,
  task: string,
  entries: FileEntry[],
  rules: RulesConfig
): RankedFile[] {
  const taskTokens = tokenizeTask(task);
  const commits = loadGitCommits(repoPath, rules);
  const gitHistory = buildGitHistory(commits);
  const contentCache = new Map<string, string>();
  const pythonIndex = buildPythonModuleIndex(repoPath, entries);
  const rustIndex = buildRustModuleIndex(repoPath, entries);
  const seedFiles = new Set<string>();
  const dirSeedCounts = new Map<string, number>();
  const rankByRelPath = new Map<string, RankedFile>();

  const ranks: RankedFile[] = [];

  for (const entry of entries) {
    const relPath = path.relative(repoPath, entry.path).replaceAll(path.sep, "/");
    const lowerPath = relPath.toLowerCase();
    const baseName = path.basename(lowerPath);

    let score = 0;
    const reasons: string[] = [];
    const scoreBreakdown: Array<{ label: string; score: number }> = [];

    for (const token of taskTokens) {
      if (baseName.includes(token)) {
        score += rules.weights.filenameMatch;
        scoreBreakdown.push({ label: `filename:${token}`, score: rules.weights.filenameMatch });
        reasons.push(`filename matches '${token}'`);
        seedFiles.add(relPath);
      } else if (lowerPath.includes(token)) {
        score += rules.weights.pathMatch;
        scoreBreakdown.push({ label: `path:${token}`, score: rules.weights.pathMatch });
        reasons.push(`path matches '${token}'`);
        seedFiles.add(relPath);
      }
    }

    const historyCount = gitHistory.get(path.normalize(relPath));
    if (historyCount) {
      const historyScore = Math.min(historyCount, rules.weights.gitHistoryMax);
      score += historyScore;
      scoreBreakdown.push({ label: "git-history", score: historyScore });
      reasons.push(`touched in git history (${historyCount})`);
    }

    if (isProbablyText(entry.path, rules.limits.binarySampleBytes, rules)) {
      try {
        const content = fs.readFileSync(entry.path, "utf8");
        contentCache.set(entry.path, content);
        const lowerContent = content.toLowerCase();
        let contentHits = 0;
        for (const token of taskTokens) {
          const regex = new RegExp(`\\b${token}\\b`, "g");
          if (regex.test(lowerContent)) {
            contentHits += 1;
          }
        }
        if (contentHits > 0) {
          const contentScore = Math.min(contentHits * rules.weights.contentMatchPerToken, rules.weights.contentMatchMax);
          score += contentScore;
          scoreBreakdown.push({ label: "content-match", score: contentScore });
          reasons.push(`content matches ${contentHits} task tokens`);
          seedFiles.add(relPath);
        }
      } catch {
        // Skip content matching on unreadable files.
      }
    }

    if (isStructuralMatch(relPath, rules.structural.entrypoints)) {
      score += rules.weights.structuralEntrypoint;
      scoreBreakdown.push({ label: "entrypoint", score: rules.weights.structuralEntrypoint });
      reasons.push("entrypoint file");
    }

    if (isStructuralMatch(relPath, rules.structural.configFiles)) {
      score += rules.weights.structuralConfig;
      scoreBreakdown.push({ label: "config", score: rules.weights.structuralConfig });
      reasons.push("config file");
    }

    if (isStructuralMatch(relPath, rules.structural.manifests)) {
      score += rules.weights.structuralManifest;
      scoreBreakdown.push({ label: "manifest", score: rules.weights.structuralManifest });
      reasons.push("manifest file");
    }

    const dir = path.dirname(relPath);
    if (seedFiles.has(relPath)) {
      dirSeedCounts.set(dir, (dirSeedCounts.get(dir) ?? 0) + 1);
    }

    const ranked: RankedFile = { ...entry, score, reasons, scoreBreakdown };
    ranks.push(ranked);
    rankByRelPath.set(relPath.replace(/\\/g, "/"), ranked);
  }

  const importGraph = buildImportGraph(repoPath, entries, contentCache, rules, pythonIndex, rustIndex);

  for (const rank of ranks) {
    const relPath = path.relative(repoPath, rank.path);
    const normalized = path.normalize(relPath);

    const dir = path.dirname(relPath);
    const dirSeeds = dirSeedCounts.get(dir) ?? 0;
    if (dirSeeds > 0 && !rank.reasons.some((reason) => reason.startsWith("filename"))) {
      const dirScore = Math.min(dirSeeds, rules.weights.dirProximityMax);
      rank.score += dirScore;
      rank.scoreBreakdown.push({ label: "dir-proximity", score: dirScore });
      rank.reasons.push(`same directory as ${dirSeeds} matched file(s)`);
    }

    const neighbors = importGraph.get(normalized);
    if (neighbors) {
      const linked = Array.from(neighbors).find((neighbor) => seedFiles.has(neighbor));
      if (linked) {
        rank.score += rules.weights.dependencyProximity;
        rank.scoreBreakdown.push({ label: "dependency-proximity", score: rules.weights.dependencyProximity });
        rank.reasons.push(`imports/used by matched file (${linked.replace(/\\/g, "/")})`);
      }
    }
  }

  const recentCommits = commits.slice(0, rules.limits.recentCommits);
  const recentFiles = new Set<string>();
  for (const commit of recentCommits) {
    for (const file of commit.files) {
      recentFiles.add(file);
    }
  }

  if (recentFiles.size > 0) {
    for (const rank of ranks) {
      const relPath = path.normalize(path.relative(repoPath, rank.path));
      if (recentFiles.has(relPath)) {
        rank.score += rules.weights.gitRecentBoost;
        rank.scoreBreakdown.push({ label: "git-recent", score: rules.weights.gitRecentBoost });
        rank.reasons.push("recently changed");
      }
    }
  }

  if (seedFiles.size > 0) {
    for (const commit of commits) {
      const hasSeed = commit.files.some((file) => seedFiles.has(file.replace(/\\/g, "/")));
      if (!hasSeed) continue;
      for (const file of commit.files) {
        const normalized = file.replace(/\\/g, "/");
        const rank = rankByRelPath.get(normalized);
        if (rank && !seedFiles.has(normalized)) {
          rank.score += rules.weights.cochangeBoost;
          rank.scoreBreakdown.push({ label: "co-change", score: rules.weights.cochangeBoost });
          rank.reasons.push("changed in same commit as matched file");
        }
      }
    }
  }

  return ranks.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.sizeBytes - b.sizeBytes;
  });
}
