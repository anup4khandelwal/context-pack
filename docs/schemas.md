# Schemas

These are informal schemas for the JSON outputs. Fields may expand over time.

## bundle.json

```json
{
  "task": "string",
  "budget": 14000,
  "estimatedTokens": 123,
  "filesIncluded": 10,
  "filesSkipped": 3,
  "files": [
    {
      "path": "relative/path.ts",
      "score": 18,
      "reasons": ["string"],
      "scoreBreakdown": [{"label": "string", "score": 3}],
      "estimatedTokens": 456,
      "sizeBytes": 789,
      "mode": "full",
      "content": "string"
    }
  ]
}
```

## explain.md

Markdown file that enumerates each included file with:
- reasons
- score breakdown
- ranking position
