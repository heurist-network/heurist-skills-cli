# heurist-skills-cli

CLI tool for browsing, installing, and managing AI agent skills from the [Heurist Mesh](https://mesh.heurist.ai) marketplace. Published as `@heurist-network/skills` on npm.

- **Entry:** `src/cli.ts` → built to `dist/cli.js` via tsup
- **Bin:** `bin/cli.mjs` (imports from `dist/cli.js`)
- **Package manager:** pnpm

## Publish Flow

```bash
pnpm build                      # build dist/
npm version patch               # bump version (requires clean git working tree)
npm publish --access public     # publish to npm
```

Note: `dist/` is gitignored but included in the npm package via the `files` field in `package.json`.
