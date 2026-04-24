# JSDoc Linting via eslint-plugin-jsdoc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Each phase ends with a `/simplify` pass (invoke `simplify` skill) before committing.

**Goal:** Add `eslint-plugin-jsdoc` to `kolibri-format`, configure 8 opt-in rules on top of `flat/recommended-error`, and remediate every resulting violation across the Kolibri codebase.

**Architecture:** The plugin is registered once in `packages/kolibri-format/eslint.config.mjs` using a files-scoped config object that merges the `flat/recommended-error` preset with the 8 opt-in rules, targeting both `.js` and `.vue` files. `flat/recommended-error` exports a single config **object** (not an array), so spreading it with `...` is correct. Remediation is split into an auto-fix pass followed by manual deletion or correction of remaining blocks — preferring deletion for empty or name-echoing blocks.

**Tech Stack:** ESLint 9 flat config, eslint-plugin-jsdoc (^62.0.0), pnpm workspaces, kolibri-format CLI.

---

## Files Touched

| File | Action |
|---|---|
| `packages/kolibri-format/package.json` | Add `eslint-plugin-jsdoc` dependency; bump version `2.2.0` → `2.3.0` |
| `packages/kolibri-format/eslint.config.mjs` | Import plugin; add jsdoc config block |
| `pnpm-lock.yaml` | Updated by `pnpm install` after package.json change |
| `kolibri/**/*.{js,vue}` (many files) | JSDoc violations remediated or blocks deleted |
| `kolibri/plugins/**/*.{js,vue}` (many files) | Same |
| `packages/**/*.{js,vue}` (excluding kolibri-format itself) | Same |

---

## Phase 1 — Install Plugin, Configure Rules, Bump Version

### Task 1: Add `eslint-plugin-jsdoc` to `kolibri-format` and configure it

**Files:**
- Modify: `packages/kolibri-format/package.json`
- Modify: `packages/kolibri-format/eslint.config.mjs`

- [x] **Step 1.1: Check the latest compatible version**

```bash
pnpm info eslint-plugin-jsdoc version
```

Record the latest version string (e.g. `62.9.0`). Use that exact version below.

- [x] **Step 1.2: Add the dependency and bump the package version**

In `packages/kolibri-format/package.json`, inside `"dependencies"` in alphabetical order between `eslint-plugin-jest-dom` and `eslint-plugin-kolibri`, add:

```json
"eslint-plugin-jsdoc": "^X.Y.Z",
```

Replace `X.Y.Z` with the exact version from Step 1.1.

Also change the `"version"` field from `"2.2.0"` to `"2.3.0"`.

The `"dependencies"` block (abridged) should look like:

```json
{
  "name": "kolibri-format",
  "version": "2.3.0",
  ...
  "dependencies": {
    ...
    "eslint-plugin-import-x": "^4.0.0",
    "eslint-plugin-jest": "^29.15.1",
    "eslint-plugin-jest-dom": "^5.5.0",
    "eslint-plugin-jsdoc": "^X.Y.Z",
    "eslint-plugin-kolibri": "workspace:*",
    ...
  }
}
```

Note: `eslint-plugin-jsdoc` belongs in `"dependencies"` (not `"devDependencies"`) because `kolibri-format` is a public package (`"private": false`) that other projects consume — consumers need the plugin at runtime to load the config.

- [x] **Step 1.3: Install the new dependency**

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` updated, no errors.

- [x] **Step 1.4: Add the jsdoc import to `eslint.config.mjs`**

Open `packages/kolibri-format/eslint.config.mjs`. After `import pluginJestDom from 'eslint-plugin-jest-dom';` (in alphabetical order between jest-dom and kolibri), add:

```js
import jsdoc from 'eslint-plugin-jsdoc';
```

Note: `const ERROR = 2` is already defined in the file — do not add it again. The jsdoc config block in Step 1.5 references this existing constant.

The full imports block at the top of the file should now be:

```js
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginImportX from 'eslint-plugin-import-x';
import pluginJest from 'eslint-plugin-jest';
import pluginJestDom from 'eslint-plugin-jest-dom';
import jsdoc from 'eslint-plugin-jsdoc';
import pluginKolibri from 'eslint-plugin-kolibri';
import pluginN from 'eslint-plugin-n';
import pluginSmallImport from 'eslint-plugin-small-import';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
```

- [x] **Step 1.5: Insert the jsdoc config block into `eslint.config.mjs`**

In the `export default [...]` array, insert the new config object immediately after `eslintConfigPrettier,` and before the large `{ plugins: { kolibri: pluginKolibri, ... } }` block.

`jsdoc.configs['flat/recommended-error']` is a plain config **object** (not an array), so spreading it with `...` into the surrounding object is correct. The spread brings in the plugin registration and default rules; the explicit `rules` block then overlays the 8 opt-in rules.

```js
  // JSDoc linting for .js and .vue files
  {
    ...jsdoc.configs['flat/recommended-error'],
    files: ['**/*.js', '**/*.vue'],
    rules: {
      ...jsdoc.configs['flat/recommended-error'].rules,
      'jsdoc/no-blank-blocks': ERROR,
      'jsdoc/no-blank-block-descriptions': ERROR,
      'jsdoc/informative-docs': ERROR,
      'jsdoc/sort-tags': ERROR,
      'jsdoc/require-description': ERROR,
      'jsdoc/require-description-complete-sentence': ERROR,
      'jsdoc/require-hyphen-before-param-description': ERROR,
      'jsdoc/require-throws': ERROR,
    },
  },
```

The array should now open with:

```js
export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/vue2-recommended'],
  pluginImportX.flatConfigs.errors,
  pluginImportX.flatConfigs.warnings,
  pluginJestDom.configs['flat/recommended'],
  eslintConfigPrettier,
  // JSDoc linting for .js and .vue files
  {
    ...jsdoc.configs['flat/recommended-error'],
    files: ['**/*.js', '**/*.vue'],
    rules: {
      ...jsdoc.configs['flat/recommended-error'].rules,
      'jsdoc/no-blank-blocks': ERROR,
      'jsdoc/no-blank-block-descriptions': ERROR,
      'jsdoc/informative-docs': ERROR,
      'jsdoc/sort-tags': ERROR,
      'jsdoc/require-description': ERROR,
      'jsdoc/require-description-complete-sentence': ERROR,
      'jsdoc/require-hyphen-before-param-description': ERROR,
      'jsdoc/require-throws': ERROR,
    },
  },
  {
    plugins: {
      kolibri: pluginKolibri,
      ...
```

- [x] **Step 1.6: TDD — verify each rule fires on a controlled violation**

Write a temporary file with a blank JSDoc block (violates `no-blank-blocks`) and lint it. This confirms the config is wired before touching real code.

```bash
cat > /tmp/test_jsdoc_blank.vue << 'EOF'
<template><div /></template>
<script>
/**
 *
 */
export default { name: 'TestJsdoc' };
</script>
EOF
node packages/kolibri-format/cli.js --pattern /tmp/test_jsdoc_blank.vue 2>&1 | grep "jsdoc/"
```

Expected: output contains `jsdoc/no-blank-blocks`. If there is no output, the `files` glob in Step 1.5 is not matching — revisit the `files` pattern.

Also verify a JS file is caught:

```bash
cat > /tmp/test_jsdoc_blank.js << 'EOF'
/**
 *
 */
export function doThing() {}
EOF
node packages/kolibri-format/cli.js --pattern /tmp/test_jsdoc_blank.js 2>&1 | grep "jsdoc/"
```

Expected: output contains `jsdoc/no-blank-blocks`.

Clean up:

```bash
rm /tmp/test_jsdoc_blank.vue /tmp/test_jsdoc_blank.js
```

- [x] **Step 1.7: Verify the config loads without crashing**

Lint a single small JS file — this confirms the ESLint config parses correctly:

```bash
node packages/kolibri-format/cli.js --pattern 'packages/kolibri-format/index.js' 2>&1 | head -20
```

Expected: shows lint output (possibly 0 violations or some violations) but NO `Cannot find module 'eslint-plugin-jsdoc'` or `SyntaxError` lines. If a module-not-found error appears, re-run `pnpm install`.

- [x] **Step 1.8: Do a dry-run lint to see violations (do NOT auto-fix yet)**

```bash
pnpm run lint-frontend 2>&1 | grep "jsdoc/" | wc -l
```

Expected: a non-zero number of jsdoc violations. If it's 0, re-check Step 1.5 (the files pattern might not be matching). If it returns a parsing error, re-check the config object syntax in Step 1.5.

- [x] **Step 1.9: /simplify pass**

Invoke the `simplify` skill over the changes in `packages/kolibri-format/`. Fix any issues found.

- [x] **Step 1.10: Commit**

```bash
git add packages/kolibri-format/package.json packages/kolibri-format/eslint.config.mjs pnpm-lock.yaml
git commit -m "Add eslint-plugin-jsdoc to kolibri-format, bump to 2.3.0"
```

---

## Phase 2 — Auto-fix Pass

### Task 2: Apply ESLint auto-fixes for jsdoc rules

The following rules have auto-fixers: `sort-tags`, `require-hyphen-before-param-description`, `require-description-complete-sentence` (partial), `no-blank-blocks` (partial), `tag-lines` (from recommended preset). Run the formatter to apply all available auto-fixes at once.

**Files:** Many `.js` and `.vue` files across `kolibri/` and `packages/` (exact set unknown until lint runs).

- [x] **Step 2.1: Run auto-fix pass**

```bash
pnpm run lint-frontend:format
```

Expected: many files modified. May take 2–5 minutes.

- [x] **Step 2.2: Check what remains after auto-fix**

```bash
pnpm run lint-frontend 2>&1 | grep "jsdoc/" | sed 's/.*jsdoc\//jsdoc\//' | sort | uniq -c | sort -rn | head -30
```

This shows a count of remaining violations per rule. Record the output — you will work through each rule category in Phase 3.

- [x] **Step 2.3: /simplify pass**

Invoke the `simplify` skill over the auto-fixed files. Fix any introduced issues.

- [x] **Step 2.4: Commit auto-fix changes**

```bash
git add -u
git commit -m "Apply eslint-plugin-jsdoc auto-fixes across codebase"
```

---

## Phase 3 — Manual Remediation

> **Scale note:** The codebase has ~3,100 JSDoc blocks across ~286 files. After auto-fix, hundreds of manual violations may remain. Use the subagent-driven approach (`superpowers:subagent-driven-development`) to parallelize tasks 3a–3f by rule category — each task is independent once you have the violation list from Step 2.2.
>
> **Parallelization conflict warning:** A single file can have violations from multiple rule categories. If you dispatch parallel agents and two agents are assigned the same file, their edits will conflict. Follow the pre-task partitioning step below before dispatching agents.

Remaining violations after the auto-fix pass must be resolved file by file. The strategy for each rule:

| Rule | Strategy |
|---|---|
| `jsdoc/no-blank-blocks` | Delete the entire JSDoc block |
| `jsdoc/no-blank-block-descriptions` | Delete the block (or add a meaningful description) |
| `jsdoc/informative-docs` | Delete the block if description just echoes the symbol name |
| `jsdoc/require-description` | Delete trivial blocks; add description only if content is valuable |
| `jsdoc/require-description-complete-sentence` | Fix sentence or delete if trivial |
| `jsdoc/require-throws` | Add `@throws {Error} Description` if the function throws; otherwise delete the block if trivial |
| `jsdoc/require-param` (from recommended) | Add missing `@param` tags, OR delete the block if it adds no value |
| `jsdoc/require-returns` (from recommended) | Add `@returns` tag, OR delete the block if it adds no value |
| Other recommended rules | Fix per error message or delete the block |

Work through violations rule-by-rule. After finishing each rule category, run lint to confirm that category is clear before moving to the next.

### Pre-task 3.0: Build per-rule file lists and detect overlaps before dispatching agents

- [x] **Step 3.0.1: Generate per-rule file lists**

```bash
pnpm run lint-frontend 2>&1 > /tmp/lint-violations.txt

# Generate a file list for each rule category
grep "jsdoc/no-blank-block" /tmp/lint-violations.txt | awk -F: '{print $1}' | sort -u > /tmp/files-blank-blocks.txt
grep "jsdoc/informative-docs" /tmp/lint-violations.txt | awk -F: '{print $1}' | sort -u > /tmp/files-informative.txt
grep "jsdoc/require-description[^-]" /tmp/lint-violations.txt | awk -F: '{print $1}' | sort -u > /tmp/files-require-desc.txt
grep "jsdoc/require-description-complete-sentence" /tmp/lint-violations.txt | awk -F: '{print $1}' | sort -u > /tmp/files-complete-sentence.txt
grep "jsdoc/require-throws" /tmp/lint-violations.txt | awk -F: '{print $1}' | sort -u > /tmp/files-require-throws.txt
grep "jsdoc/" /tmp/lint-violations.txt | grep -v "jsdoc/no-blank-block\|jsdoc/informative-docs\|jsdoc/require-description\|jsdoc/require-throws\|jsdoc/sort-tags\|jsdoc/require-hyphen" | awk -F: '{print $1}' | sort -u > /tmp/files-other.txt
```

- [x] **Step 3.0.2: Detect files that appear in multiple rule lists**

```bash
sort /tmp/files-blank-blocks.txt /tmp/files-informative.txt /tmp/files-require-desc.txt /tmp/files-complete-sentence.txt /tmp/files-require-throws.txt /tmp/files-other.txt | uniq -d
```

Any file printed here appears in multiple rule lists. **Assign each such file to a single agent that handles ALL its violations**, rather than splitting it across agents. Update the per-rule lists by removing those files from all but one list (the one for the rule with the most violations in that file, or the first alphabetically).

Once the lists are clean, dispatch one agent per task using the file list for that task.

---

### Task 3a: Remediate `no-blank-blocks` and `no-blank-block-descriptions`

**Files:** From `/tmp/files-blank-blocks.txt` (generated in Step 3.0.1).

- [x] **Step 3a.1: List all files with violations**

```bash
cat /tmp/files-blank-blocks.txt
```

- [x] **Step 3a.2: For each file listed, delete the offending JSDoc blocks**

A blank JSDoc block looks like:
```js
/**
 *
 */
```
or (blank description with tags — `no-blank-block-descriptions`):
```js
/**
 * @param {string} name
 */
function doThing(name) { ... }
```

Delete the entire block (`/** ... */`), not just the blank line inside it. Do not leave an empty line where the block was.

- [x] **Step 3a.3: Verify this rule category is clear**

```bash
pnpm run lint-frontend 2>&1 | grep "jsdoc/no-blank-block"
```

Expected: no output.

- [x] **Step 3a.4: Commit**

```bash
git add -u
git commit -m "Remove blank JSDoc blocks (no-blank-blocks, no-blank-block-descriptions)"
```

---

### Task 3b: Remediate `informative-docs`

The `informative-docs` rule fires when the description only restates the symbol name (e.g., function named `loadData` with description "Loads data" or "Load data."). Delete these blocks.

**Files:** From `/tmp/files-informative.txt` (generated in Step 3.0.1).

- [x] **Step 3b.1: List files with violations**

```bash
cat /tmp/files-informative.txt
```

- [x] **Step 3b.2: For each file, delete the uninformative JSDoc blocks**

The ESLint error message will say something like:
> "This description is the same as the name of the documented item."

Delete the entire `/** ... */` block above the identified symbol.

- [x] **Step 3b.3: Verify this rule category is clear**

```bash
pnpm run lint-frontend 2>&1 | grep "jsdoc/informative-docs"
```

Expected: no output.

- [x] **Step 3b.4: Commit**

```bash
git add -u
git commit -m "Remove uninformative JSDoc descriptions (informative-docs)"
```

---

### Task 3c: Remediate `require-description` and `require-description-complete-sentence`

These two rules are handled together because they often flag the same blocks:
- `require-description` fires when a JSDoc block has no description text (only tags, or an empty block not caught by `no-blank-blocks`).
- `require-description-complete-sentence` fires when a description doesn't start with a capital letter or doesn't end with a period. The auto-fixer in Phase 2 resolves many cases; this task covers whatever remains.

**Decision rule:** If the block contains only `@param`/`@returns`/`@type` tags with no prose description, and the function/variable name is self-documenting, delete the block. Only add or fix a description if it provides genuine value beyond what the symbol name already conveys.

**Files:** Union of `/tmp/files-require-desc.txt` and `/tmp/files-complete-sentence.txt` (generated in Step 3.0.1), minus any files already handled in 3a/3b.

- [x] **Step 3c.1: List files with violations**

```bash
sort -u /tmp/files-require-desc.txt /tmp/files-complete-sentence.txt
```

- [x] **Step 3c.2: For each file, fix or delete each violating JSDoc block**

For blocks where you add or fix a description, write a complete sentence ending with a period:

```js
/**
 * Returns the total number of content nodes in the channel.
 *
 * @param {string} channelId - The channel UUID.
 * @returns {number} Total node count.
 */
function getNodeCount(channelId) { ... }
```

Common sentence fixes:
- Missing period at end: append `.` to the last description sentence.
- Starts with lowercase: capitalize the first letter.
- Run-on or fragmented sentence: rewrite as one clean sentence.

Example before (both violations):
```js
/**
 * loads the content node by id
 *
 * @param {string} id - The node UUID.
 */
```

Example after (fixed):
```js
/**
 * Loads the content node by ID.
 *
 * @param {string} id - The node UUID.
 */
```

For blocks where the function name is self-explanatory and the block adds no value, delete it entirely.

- [x] **Step 3c.3: Verify both rule categories are clear**

```bash
pnpm run lint-frontend 2>&1 | grep -E "jsdoc/require-description|jsdoc/require-description-complete-sentence"
```

Expected: no output.

- [x] **Step 3c.4: Commit**

```bash
git add -u
git commit -m "Fix require-description violations: add descriptions or remove trivial blocks"
```

---

### Task 3d: Remediate `require-throws`

This rule fires when a documented function contains a `throw` statement but has no `@throws` tag.

**Decision rule:**
- If the JSDoc block is otherwise valuable (meaningful description, documented params), add a `@throws` tag.
- If the JSDoc block is trivial (only the function name echoed), delete the block.

**Files:** From `/tmp/files-require-throws.txt` (generated in Step 3.0.1).

- [x] **Step 3d.1: List files with violations**

```bash
cat /tmp/files-require-throws.txt
```

- [x] **Step 3d.2: For each file, add `@throws` or delete the block**

When adding `@throws`, place it after `@returns` (if present), using the format:

```js
/**
 * Loads a content node by ID.
 *
 * @param {string} id - The content node UUID.
 * @returns {Object} The content node object.
 * @throws {Error} If the node with the given ID does not exist.
 */
function loadNode(id) {
  if (!nodes[id]) throw new Error(`Node ${id} not found`);
  return nodes[id];
}
```

- [x] **Step 3d.3: Verify this rule category is clear**

```bash
pnpm run lint-frontend 2>&1 | grep "jsdoc/require-throws"
```

Expected: no output.

- [x] **Step 3d.4: Commit**

```bash
git add -u
git commit -m "Fix require-throws violations: add @throws tags or remove trivial blocks"
```

---

### Task 3e: Remediate remaining `flat/recommended-error` violations

This task covers violations from rules in the `flat/recommended-error` preset that weren't handled by auto-fix or earlier tasks. Common ones:

- `jsdoc/require-param`: Missing `@param` for a documented function's parameters.
- `jsdoc/require-param-description`: A `@param` tag is missing its description.
- `jsdoc/require-returns`: A documented function returns a value but has no `@returns` tag.
- `jsdoc/check-param-names`: `@param` tag names don't match actual function parameter names.
- `jsdoc/check-types`: Invalid JSDoc type expressions.
- `jsdoc/valid-types`: JSDoc type syntax is invalid.

**Decision rule for each:** Fix if the block is otherwise valuable. Delete the block if it adds no value and fixing would be padding for the sake of the linter.

**Files:** From `/tmp/files-other.txt` (generated in Step 3.0.1).

- [x] **Step 3e.1: Get a count of remaining violations by rule**

```bash
pnpm run lint-frontend 2>&1 | grep "jsdoc/" | sed 's/.*\(jsdoc\/[a-z-]*\).*/\1/' | sort | uniq -c | sort -rn
```

Work through each rule category, highest count first.

- [x] **Step 3e.2: For each remaining rule violation category, fix or delete**

For `require-param`: Add the missing `@param` tag:
```js
/**
 * Fetches user data from the server.
 *
 * @param {string} userId - The user's UUID.
 * @param {Object} options - Request options.
 * @returns {Promise<Object>} Resolved user object.
 */
async function fetchUser(userId, options) { ... }
```

For `check-param-names`: Rename the `@param` tag to match the actual parameter name.

For `require-returns`: Add `@returns {Type} Description.` after the last `@param`, or delete if trivial.

For `check-types` / `valid-types`: Correct the type expression (use `{string}` not `{String}`, `{Object}` not `{object}` per JSDoc conventions).

- [x] **Step 3e.3: Verify all jsdoc violations are clear**

```bash
pnpm run lint-frontend 2>&1 | grep "jsdoc/"
```

Expected: no output.

- [x] **Step 3e.4: /simplify pass**

Invoke the `simplify` skill over all changed files in Phase 3. Fix any issues found.

- [x] **Step 3e.5: Commit remaining fixes**

```bash
git add -u
git commit -m "Fix remaining jsdoc violations from flat/recommended-error preset"
```

---

## Phase 4 — Final Verification

### Task 4: Confirm clean lint pass

- [x] **Step 4.1: Run full lint suite with no auto-fix**

```bash
pnpm run lint-frontend
```

Expected: exits 0 with no errors. If any violations remain, return to the appropriate Task 3 sub-task to fix them.

- [x] **Step 4.2: Confirm jsdoc config is active for both file types**

```bash
cat > /tmp/test_jsdoc.vue << 'EOF'
<template><div /></template>
<script>
/**
 *
 */
export default { name: 'TestJsdoc' };
</script>
EOF
node packages/kolibri-format/cli.js --pattern /tmp/test_jsdoc.vue 2>&1 | grep "jsdoc/"
rm /tmp/test_jsdoc.vue
```

Expected: output contains `jsdoc/no-blank-blocks`. If no output, the `.vue` files glob in the jsdoc config is not matching — revisit Step 1.5 to check the `files` pattern.

- [x] **Step 4.3: Verify version bump in package.json**

```bash
grep '"version"' packages/kolibri-format/package.json
```

Expected: `"version": "2.3.0"`.

- [x] **Step 4.4: Verify pnpm-lock.yaml contains eslint-plugin-jsdoc**

```bash
grep 'eslint-plugin-jsdoc' pnpm-lock.yaml | head -5
```

Expected: at least one line showing the package and its resolved version.

- [x] **Step 4.5: Commit any final simplify fixes**

If the `simplify` skill (invoked at the end of each prior phase) made any changes that weren't yet committed, commit them now:

```bash
git status
```

If `git status` shows no uncommitted changes, skip this step. Otherwise:

```bash
git add -u
git commit -m "Final simplify pass on kolibri-format config"
```

---

## Acceptance Criteria Checklist

Before declaring done, verify each item from the issue:

- [x] `eslint-plugin-jsdoc` is listed in `packages/kolibri-format/package.json` dependencies
- [x] `jsdoc.configs['flat/recommended-error']` rules are spread into the config object in `eslint.config.mjs`
- [x] All 8 opt-in rules are explicitly set to `ERROR` in the config: `no-blank-blocks`, `no-blank-block-descriptions`, `informative-docs`, `sort-tags`, `require-description`, `require-description-complete-sentence`, `require-hyphen-before-param-description`, `require-throws`
- [x] The config object's `files` includes both `**/*.js` and `**/*.vue`
- [x] `pnpm run lint-frontend` exits 0 with no jsdoc violations
- [x] `packages/kolibri-format/package.json` shows version `2.3.0`
- [x] `pnpm-lock.yaml` includes an entry for `eslint-plugin-jsdoc`
