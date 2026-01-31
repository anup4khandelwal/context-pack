# Release checklist

## Pre-flight

- `npm test`
- `npm run build`
- Update `CHANGELOG.md`
- Update version: `npm version patch|minor|major`

## Validate package contents

- `npm pack`
- Inspect the tarball:
  - `tar -tf context-pack-*.tgz`
  - Ensure only `dist/`, `rules/`, `README.md`, `LICENSE` are included

## Publish

- `npm login`
- `npm publish --access public`

## Git tag

- `git tag vX.Y.Z`
- `git push --tags`
