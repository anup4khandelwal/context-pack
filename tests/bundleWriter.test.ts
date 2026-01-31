import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildBundle, writeBundleJson } from "../src/bundleWriter.js";

const rules = {
  budget: {
    defaultTokens: 14000,
    tokenCharsPerToken: 4,
    maxFileTokens: 4000,
    trimChars: 20,
    signatureMaxLines: 20,
  },
  weights: {
    filenameMatch: 6,
    pathMatch: 3,
    contentMatchPerToken: 2,
    contentMatchMax: 12,
    gitHistoryMax: 20,
    gitRecentBoost: 8,
    cochangeBoost: 4,
    dependencyProximity: 4,
    dirProximityMax: 3,
    structuralEntrypoint: 6,
    structuralConfig: 5,
    structuralManifest: 5,
  },
  limits: {
    maxCommits: 200,
    maxFiles: 5000,
    recentCommits: 20,
    binarySampleBytes: 4096,
  },
  ignore: {
    default: [],
    tests: [],
  },
  structural: {
    entrypoints: [],
    configFiles: [],
    manifests: [],
  },
  dependency: {
    extensions: [".ts"],
  },
  files: {
    textExtensions: [".ts"],
    signaturePatterns: {},
  },
};

describe("bundleWriter", () => {
  it("writes bundle.json with content", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "context-pack-"));
    const repoPath = path.join(tempDir, "repo");
    const filePath = path.join(repoPath, "src", "example.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "export const foo = 1;\nexport function bar() {}\n", "utf8");

    const bundle = buildBundle(
      repoPath,
      "example task",
      [
        {
          path: filePath,
          sizeBytes: 42,
          score: 10,
          reasons: ["filename matches 'example'"],
          scoreBreakdown: [{ label: "filename:example", score: 6 }],
        },
      ],
      1000,
      rules
    );

    const outPath = path.join(tempDir, "bundle.json");
    writeBundleJson(bundle, outPath);

    const payload = JSON.parse(fs.readFileSync(outPath, "utf8")) as { files: Array<{ content: string }> };
    expect(payload.files.length).toBe(1);
    expect(payload.files[0].content.length).toBeGreaterThan(0);
  });
});
