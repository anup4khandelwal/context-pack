import fs from "node:fs";
import path from "node:path";

export type RulesConfig = {
  budget: {
    defaultTokens: number;
    tokenCharsPerToken: number;
    maxFileTokens: number;
    trimChars: number;
    signatureMaxLines: number;
  };
  weights: {
    filenameMatch: number;
    pathMatch: number;
    contentMatchPerToken: number;
    contentMatchMax: number;
    gitHistoryMax: number;
    gitRecentBoost: number;
    cochangeBoost: number;
    dependencyProximity: number;
    dirProximityMax: number;
    structuralEntrypoint: number;
    structuralConfig: number;
    structuralManifest: number;
  };
  limits: {
    maxCommits: number;
    maxFiles: number;
    recentCommits: number;
    binarySampleBytes: number;
  };
  ignore: {
    default: string[];
    tests: string[];
  };
  structural: {
    entrypoints: string[];
    configFiles: string[];
    manifests: string[];
  };
  dependency: {
    extensions: string[];
  };
  files: {
    textExtensions: string[];
    signaturePatterns: Record<string, string[]>;
  };
};

export function loadRules(rulesPath?: string): RulesConfig {
  const resolved = rulesPath
    ? path.resolve(rulesPath)
    : path.resolve(process.cwd(), "rules", "default.rules.json");

  if (!fs.existsSync(resolved)) {
    throw new Error(`Rules file not found: ${resolved}`);
  }

  const raw = fs.readFileSync(resolved, "utf8");
  return JSON.parse(raw) as RulesConfig;
}
