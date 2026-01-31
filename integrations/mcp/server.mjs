#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const ToolInputSchema = z.object({
  repoPath: z.string().optional(),
  task: z.string(),
  budget: z.number().optional(),
  format: z.enum(["md", "json", "both"]).optional(),
});

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function loadRulesWithoutEnv() {
  const rulesPath = path.join(repoRoot, "rules", "default.rules.json");
  const raw = fs.readFileSync(rulesPath, "utf8");
  const rules = JSON.parse(raw);
  rules.ignore = rules.ignore || { default: [], tests: [] };
  rules.ignore.default = Array.from(new Set([...(rules.ignore.default || []), ".env", ".env.*"]));
  const tempPath = path.join(os.tmpdir(), `context-pack-rules-${Date.now()}.json`);
  fs.writeFileSync(tempPath, JSON.stringify(rules, null, 2));
  return tempPath;
}

function sanitizeBundle(bundleJson) {
  const filteredFiles = (bundleJson.files || []).filter((file) => !file.path.includes(".env"));
  return {
    ...bundleJson,
    filesIncluded: filteredFiles.length,
    files: filteredFiles,
  };
}

function filterMarkdownSections(md) {
  const sections = md.split(/\n## /);
  if (sections.length === 1) return md;
  const header = sections.shift();
  const kept = sections.filter((section) => !section.startsWith(".env") && !section.includes("/.env"));
  return [header, ...kept.map((s) => `## ${s}`)].join("\n");
}

const server = new Server(
  {
    name: "context-pack-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "context_pack_bundle",
        description: "Generate context-pack bundle outputs.",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: { type: "string" },
            task: { type: "string" },
            budget: { type: "number" },
            format: { type: "string", enum: ["md", "json", "both"] },
          },
          required: ["task"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "context_pack_bundle") {
    throw new Error("Unknown tool");
  }

  const input = ToolInputSchema.parse(request.params.arguments);
  const repoPath = path.resolve(input.repoPath ?? process.cwd());
  const budget = input.budget ?? 14000;
  const format = input.format ?? "both";
  const rulesPath = loadRulesWithoutEnv();

  const cliArgs = ["bundle", "--task", input.task, "--budget", String(budget), "--repo", repoPath, "--out", ".context-pack", "--rules", rulesPath];

  const cliCandidates = [
    { cmd: "context-pack", args: cliArgs },
    { cmd: "node", args: [path.join(repoRoot, "dist", "index.js"), ...cliArgs] },
  ];

  let ran = false;
  for (const candidate of cliCandidates) {
    try {
      await runCommand(candidate.cmd, candidate.args, repoPath);
      ran = true;
      break;
    } catch {
      // try next
    }
  }

  if (!ran) {
    throw new Error("Failed to run context-pack CLI");
  }

  const outputDir = path.join(repoPath, ".context-pack");
  const bundleMdPath = path.join(outputDir, "bundle.md");
  const bundleJsonPath = path.join(outputDir, "bundle.json");
  const explainPath = path.join(outputDir, "explain.md");

  let bundleMd = fs.readFileSync(bundleMdPath, "utf8");
  let explainMd = fs.readFileSync(explainPath, "utf8");
  let bundleJson = JSON.parse(fs.readFileSync(bundleJsonPath, "utf8"));

  bundleJson = sanitizeBundle(bundleJson);
  bundleMd = filterMarkdownSections(bundleMd);
  explainMd = filterMarkdownSections(explainMd);

  const result = {
    outputDir,
    explainMd,
  };

  if (format === "md" || format === "both") {
    result.bundleMd = bundleMd;
  }
  if (format === "json" || format === "both") {
    result.bundleJson = bundleJson;
  }

  return {
    content: [
      {
        type: "json",
        json: result,
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
