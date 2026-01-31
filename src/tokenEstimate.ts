import type { RulesConfig } from "./config.js";

export function estimateTokens(text: string, rules: RulesConfig): number {
  if (!text) return 0;
  return Math.ceil(text.length / rules.budget.tokenCharsPerToken);
}
