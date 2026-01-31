import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const server = spawn("node", ["dist/server.js"], {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: ["pipe", "pipe", "inherit"],
});

const transport = new StdioClientTransport({
  reader: server.stdout,
  writer: server.stdin,
});

const client = new Client({ name: "context-pack-mcp-smoke", version: "0.1.0" }, { capabilities: {} });
await client.connect(transport);

const tools = await client.listTools();
if (!tools.tools.find((tool) => tool.name === "context_pack_bundle")) {
  throw new Error("Tool not registered");
}

const result = await client.callTool({
  name: "context_pack_bundle",
  arguments: {
    task: "smoke test",
    budget: 1000,
    format: "md",
  },
});

if (!result.content?.[0]?.json?.bundleMd) {
  throw new Error("Expected bundleMd in response");
}

console.log("MCP smoke test passed");
await client.close();
server.kill();
