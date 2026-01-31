import { defineConfig } from "vitepress";

export default defineConfig({
  title: "context-pack",
  description: "Deterministic context bundling for Claude Code and Codex",
  base: "/context-pack/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/" },
      { text: "Integrations", link: "/integrations" },
      { text: "Contributing", link: "/contributing" },
      { text: "Release", link: "/release" }
    ],
    sidebar: [
      { text: "Overview", link: "/" },
      { text: "Codex", link: "/codex" },
      { text: "Claude Plugin", link: "/claude-plugin" },
      { text: "Integrations", link: "/integrations" },
      { text: "Contributing", link: "/contributing" },
      { text: "Release", link: "/release" }
    ]
  }
});
