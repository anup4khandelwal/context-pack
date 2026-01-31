import { describe, expect, it, vi } from "vitest";

import { rankFiles } from "../src/rankFiles.js";

const makeEntry = (path: string, sizeBytes = 10) => ({ path, sizeBytes });

vi.mock("../src/scanRepo.js", async () => {
  const actual = await vi.importActual<typeof import("../src/scanRepo.js")>("../src/scanRepo.js");
  return {
    ...actual,
    isGitRepo: () => false,
  };
});

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: (filePath: string) => {
      if (filePath.endsWith("alpha.ts")) {
        return "const alpha = 1;";
      }
      if (filePath.endsWith("beta.ts")) {
        return "import { alpha } from './alpha';";
      }
      return "";
    },
    existsSync: (filePath: string) => {
      return filePath.endsWith("alpha.ts") || filePath.endsWith("beta.ts");
    },
  };
});

describe("rankFiles", () => {
  it("scores filename and content matches and includes breakdown", () => {
    const rules = {
      budget: {
        defaultTokens: 14000,
        tokenCharsPerToken: 4,
        maxFileTokens: 4000,
        trimChars: 8000,
        signatureMaxLines: 200,
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
    const entries = [
      makeEntry("/repo/src/alpha.ts"),
      makeEntry("/repo/src/beta.ts"),
    ];

    const ranked = rankFiles("/repo", "alpha feature", entries, rules);
    const alpha = ranked.find((item) => item.path.endsWith("alpha.ts"));

    expect(alpha).toBeDefined();
    expect(alpha?.score).toBeGreaterThan(0);
    expect(alpha?.reasons.some((reason) => reason.includes("filename matches"))).toBe(true);
    expect(alpha?.scoreBreakdown.length).toBeGreaterThan(0);
  });
});
