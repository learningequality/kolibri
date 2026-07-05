<!-- Generic guidance for all coding agents (Claude Code, Zed, Cursor, etc.) -->

# Kolibri Development Guide for AI Coding Agents

**Project:** Kolibri - Offline learning platform for low-resource communities
**Stack:** Python/Django backend, Vue.js 2.7 frontend, pytest/Jest testing
**Platforms:** Linux, Windows, Mac, Android (via python-for-android)

## Quick Start

```bash
uv sync --group dev --all-packages    # Python deps + venv (all workspace member packages included)
pnpm install                          # Node deps
prek install                          # Required — commits fail without this
export KOLIBRI_RUN_MODE=dev
kolibri configure setup               # Database migrations and updates
```

Dev server:
```bash
pnpm devserver             # Django on port 8000 + Webpack watcher + sandbox dev server
```

→ Full setup: `docs/getting_started.rst` | Architecture: `docs/stack.rst` | Dev data: `docs/howtos/dev_data_setup.md`

## Critical Gotchas

### ⚠️ BEFORE Writing Any Vue Component, Search for Existing Ones
Do not create a new component without first searching for an existing solution:
1. **Kolibri Design System** ([docs](https://design-system.learningequality.org/)) — `KButton`, `KCircularLoader`, `KTextbox`, `KSelect`, `KModal`, `KCheckbox`, `KIcon`, etc.
2. **`packages/kolibri/components/`** — `AuthMessage`, `BottomAppBar`, `AppBar`, etc.
3. **`packages/kolibri-common/components/`** — `AccordionContainer`, `BaseToolbar`, etc.

Use existing components (e.g., `KTable` for tabular data, `KCircularLoader` for loading states). If one does 80% of what you need, wrap it — do not rewrite.

### ⚠️ Use Theme Tokens, Not Hard-Coded Colors
Never use raw color values. Access theme colors via `$themeTokens` and `$themePalette`:
```vue
<template>
  <div :style="{ color: $themeTokens.text, backgroundColor: $themeTokens.surface }">
    <span :style="{ color: $themeTokens.annotation }">secondary text</span>
  </div>
</template>
```
For computed dynamic styles, use `$computedClass`. See `docs/frontend_architecture/core.rst`.

### ⚠️ Style Blocks, Not Inline — RTL Depends On It
Non-dynamic styles go in `<style>` blocks. RTLCSS auto-flips directional properties (`padding-left` → `padding-right`) in style blocks but **cannot flip inline styles**. Dynamic directional styles must check `isRtl`. → `docs/i18n.rst`

### ⚠️ Composition API, Not Options API
New components must use `setup()`. Do not use Options API (`data()`, `computed:`, `methods:`).

### ⚠️ No New Vuex — Use Composables
Vuex is deprecated. Use Vue composables for state. → `docs/frontend_architecture/composables.rst`, `docs/frontend_architecture/vuex.rst`

### ⚠️ Use `responsive-window` / `responsive-element`, Not Media Queries
Do not use CSS `@media` queries. Kolibri runs on Android and varied screen sizes. Use the `responsive-window` or `responsive-element` system for responsive layouts.

### ⚠️ Internationalize All User-Visible Text
Use `createTranslator` — never hard-code strings in templates:
```javascript
const strings = createTranslator('QuizStrings', {
  title: { message: 'Quiz Results', context: 'Page heading' },
});
// In setup(), destructure with $ suffix:
const { title$ } = strings;  // title$() returns translated string
```

### ⚠️ API Calls via Resource Classes Only
Use `Resource` from `kolibri/apiResource`. Define in `apiResources.js`. Never use raw `fetch` or `axios`.

### ⚠️ Backend APIs: Use ValuesViewset with Serializer Derivation
Use `ValuesViewset` (or `ReadOnlyValuesViewset`) from `kolibri.core.api` for new API endpoints — not `ModelViewSet`, `ViewSet`, or `GenericViewSet`. Define a DRF serializer as the source of truth; the viewset derives the `values()` query automatically:
```python
from rest_framework import serializers
from kolibri.core.api import ReadOnlyValuesViewset

class MySerializer(serializers.ModelSerializer):
    class Meta:
        model = MyModel
        fields = ("id", "title", "description")

class MyViewSet(ReadOnlyValuesViewset):
    serializer_class = MySerializer
    queryset = MyModel.objects.all()
```
Do **not** define explicit `values` tuples or `field_map` dicts on new viewsets — these are legacy patterns being migrated away.

The model should define a default `ordering` in its `Meta`, or the viewset's `queryset` should set an explicit `order_by()` — response ordering (and pagination) is nondeterministic otherwise.

Viewset permissions use `KolibriAuthPermissions` from `kolibri.core.auth.api`, which delegates object-level checks to the model's declarative permissions (e.g. `RoleBasedPermissions`). It only works for models that participate in Kolibri's auth/permissions system — models without those declarations need a different permission class.

See `docs/backend_architecture/api_patterns.rst`.

### ⚠️ Testing is Required
- **Python:** pytest is the test runner. Django API tests extend `APITestCase` from `rest_framework.test`. Other Django tests extend `django.test.TestCase`. Only use bare pytest-style function tests for non-Django code.
- **Frontend:** Jest runner + Vue Testing Library. Do NOT import from `vitest` or `@vue/test-utils`. `describe`/`it`/`expect` are Jest globals (no import needed). Use `jest.fn()` and `jest.mock()`:
  ```javascript
  import { render, screen } from '@testing-library/vue';
  // describe, it, expect are Jest globals — do NOT import them
  describe('MyComponent', () => {
    it('renders', () => {
      render(MyComponent, { props: { title: 'Hello' } });
      expect(screen.getByText('Hello')).toBeTruthy();
    });
  });
  ```
- **TDD:** Write a failing test first, then make it pass. This is especially important for bug fixes — always write a test that reproduces the bug before fixing it.

### ⚠️ Pre-commit Auto-fixes Files
When a commit fails: prek auto-fixes files → **`git add` the fixed files** → re-commit.

## Project Structure

```
kolibri/
├── kolibri/core/          # Core modules: auth/, content/, device/, lessons/, exams/, logger/, tasks/
├── kolibri/plugins/       # Frontend plugins: learn/, coach/, facility/, ...
│   └── <plugin>/          # api_urls.py, viewsets.py, kolibri_plugin.py, test/
│       └── frontend/      # app.js, views/, composables/, routes/, __tests__/
├── packages/              # JS packages: kolibri/, kolibri-common/
├── docs/                  # Developer docs (architecture, testing, i18n, etc.)
├── requirements/          # Python deps
└── test/                  # Test utilities and fixtures
```

→ See `docs/backend_architecture/plugins.rst` for plugin layout and core-vs-plugins decision guide

## Code Quality

→ See `docs/code_quality.rst` for detailed principles. Key: tests assert behavior not implementation, composition over inheritance, let errors propagate, don't weaken existing tests, compute don't store, tell don't ask.

## Key Conventions

**Python:** F-strings preferred. One import per line. `DateTimeTzField` for timestamps (not Django's `DateTimeField`). `UUIDField` from morango for syncable models. Descriptive migration names (no `_auto_`). All imports at file top — inline imports are only permitted to prevent circular imports.

**Vue:** PascalCase filenames. Component `name` must match filename. Use `computed()` for derived values.

**Git:** Imperative commit messages, no conventional-commit prefixes. Logical commit ordering for review. Ruff/Prettier enforced by prek.

**Don't guess — look at existing code** for patterns: `docs/backend_architecture/api_patterns.rst`, `docs/frontend_architecture/`, existing test files in `__tests__/` or `test/`.

## Running Tests

```bash
pytest kolibri/path/to/test/                          # Python (directory)
pytest kolibri/core/auth/test/ -k test_login          # Python (filter by name)
pnpm test-jest path/to/file.spec.js                # Frontend (single file)
pnpm test-jest --testPathPattern learn              # Frontend (filter by pattern)
prek run --all-files                                  # Lint (all files)
prek run --files path/to/File.vue                     # Lint (specific file)
```

Do NOT use `npx jest` or invoke Jest directly — always use `pnpm test-jest`. Always use `prek` as the single entry point for linting — do not invoke ESLint or other linters directly.

## Docs Reference

Testing: `docs/testing.rst`, `docs/frontend_architecture/unit_testing.rst`, `docs/backend_architecture/testing.rst` | Frontend arch: `docs/frontend_architecture/` | Backend arch: `docs/backend_architecture/` | i18n: `docs/i18n.rst` | Code quality: `docs/code_quality.rst` | How-tos: `docs/howtos/` | Workflow: `docs/development_workflow.rst` | Multi-agent setup: `docs/howtos/multi_agent_setup.md` | User docs: https://kolibri.readthedocs.io/
