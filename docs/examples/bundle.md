# context-pack bundle

Task: Add caching to user lookup
Budget: 14000
Estimated tokens: 320
Files included: 2
Files skipped: 0

## Index
- src/userRepo.ts (180 tokens, full) — filename matches 'user'; content matches 1 task tokens
- src/cache.ts (140 tokens, full) — filename matches 'cache'

## src/userRepo.ts
Reason: filename matches 'user'; content matches 1 task tokens
Mode: full
```ts
export async function getUser(id: string) {
  return db.users.find(id);
}
```

## src/cache.ts
Reason: filename matches 'cache'
Mode: full
```ts
export function cacheGet(key: string) {
  return memory.get(key);
}
```
