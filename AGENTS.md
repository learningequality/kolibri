<!-- Generic guidance for all coding agents (Claude Code, Zed, Cursor, etc.)
     For Claude Code specific notes, see Claude.md -->

# Kolibri Development Guide for AI Coding Agents

**Project:** Kolibri - Offline learning platform for low-resource communities
**Stack:** Python/Django backend, Vue.js 2.7 frontend, pytest/Jest testing

## Quick Start

1. **Install Python dependencies:** `pip install -r requirements/dev.txt`
2. **Install Node dependencies:** `pnpm install`
3. **Install pre-commit hooks:** `pre-commit install` (required — commits will fail without this)
4. **Set dev mode:** `export KOLIBRI_RUN_MODE=dev`
5. **Run database migrations:** `kolibri manage migrate`

→ Full setup details in `docs/getting_started.rst`

## Documentation Map

- **Setup & Workflow:** `docs/getting_started.rst`, `docs/development_workflow.rst`
- **Architecture:** `docs/stack.rst`, `docs/frontend_architecture/`, `docs/backend_architecture/`
- **Testing:** `docs/testing.rst` (TDD principles), `docs/frontend_architecture/unit_testing.rst`, `docs/backend_architecture/testing.rst`
- **How-tos:** `docs/howtos/` (specific tasks like rebasing, PR reviews)

## Critical Agent Gotchas

### ⚠️ Component Reuse Hierarchy
Before creating new components, check existing ones in this order:
1. **Kolibri Design System** (`kolibri-design-system`) — use KDS components first whenever possible
2. **Kolibri package** (`packages/kolibri/components/`) — core app components (e.g., `AuthMessage`, `CoreTable`, `BottomAppBar`)
3. **Kolibri-Common package** (`packages/kolibri-common/components/`) — shared components across plugins (e.g., `AccordionContainer`, `BaseToolbar`)

### ⚠️ Use Theme Tokens for Styling
Do not hard-code colors or core styles. Use `$themeTokens` and `$themePalette` for dynamic theming, and `$computedClass` for computed styles. See `docs/frontend_architecture/core.rst` for details.

### ⚠️ Prefer Style Blocks Over Inline Styles
Put non-dynamic styles in `<style>` blocks, not inline. RTLCSS automatically flips directional styles (e.g., `padding-left` → `padding-right`) in style blocks for RTL languages, but cannot flip inline styles. If a directional style must be inline because it is dynamic, it must respond to the `isRtl` property.
→ See `docs/i18n.rst` for full RTL guidance

### ⚠️ Use Composition API, Not Options API
New components should use the Composition API (`setup()`) rather than the Options API. Existing Options API components don't need to be migrated, but new code should follow the Composition API pattern.

### ⚠️ Vuex is Deprecated
**DO NOT** create new Vuex stores or extend existing ones. Use Vue composables instead.
→ See `docs/frontend_architecture/composables.rst` and `docs/frontend_architecture/vuex.rst`

### ⚠️ Testing is Required
Nearly all code changes need tests:
- **Python:** Use pytest, write tests for all backend code
- **Vue:** Use Vue Testing Library (NOT vue-test-utils for new tests)
- **TDD:** Write failing test first for bugs, build features incrementally

→ See `docs/testing.rst` for TDD principles, specific testing docs for patterns

### ⚠️ Pre-commit Auto-fixes Files
When commit fails:
1. Pre-commit auto-fixes many issues (formatting, imports)
2. **You must `git add` the auto-fixed files again**
3. Then re-commit

→ See "Pre-commit hooks" section in `docs/getting_started.rst`

## Project Structure

```
kolibri/
├── docs/                  # Developer documentation
├── kolibri/               # Main Python package
│   ├── core/              # Core modules (always enabled)
│   │   ├── auth/          # Authentication & permissions
│   │   ├── content/       # Content models & APIs
│   │   ├── device/        # Device-level settings & management
│   │   ├── lessons/       # Lesson management
│   │   ├── exams/         # Quiz/exam system
│   │   ├── logger/        # Activity logging
│   │   └── tasks/         # Background task system
│   └── plugins/           # Frontend plugins (can be disabled)
│       ├── learn/         # Learner interface
│       ├── coach/         # Coach/teacher interface
│       ├── facility/      # Facility management
│       └── ...            # Viewer plugins, setup wizard, etc.
├── packages/              # JavaScript packages (pnpm monorepo)
│   ├── kolibri/           # Core frontend (components, composables)
│   ├── kolibri-common/    # Shared components & composables
│   ├── kolibri-tools/     # Dev tooling
│   └── ...                # Build, i18n, format, etc.
├── requirements/          # Python dependency files
└── test/                  # Test utilities and fixtures
```

A typical plugin has both backend and frontend code:
```
kolibri/plugins/learn/
├── api_urls.py            # API URL routes
├── viewsets.py            # Django REST viewsets
├── kolibri_plugin.py      # Plugin definition
├── test/                  # Backend tests
└── frontend/              # Frontend code
    ├── app.js             # Entry point
    ├── views/             # Vue components/pages
    ├── composables/       # Vue composables
    ├── routes/            # Vue Router routes
    └── __tests__/         # Frontend tests (Jest)
```

→ See `docs/backend_architecture/plugins.rst` for core vs plugins decision guide

## Finding Patterns

**Don't guess - look at existing code:**
- API patterns → `docs/backend_architecture/api_patterns.rst` (ValuesViewset preferred)
- Component patterns → Search recent components, check `docs/frontend_architecture/` and `packages/kolibri-common/`
- Test patterns → Look at existing test files in `__tests__/` or `test/` directories

## Running Dev Servers

Run the Python backend and frontend webpack watcher as separate parallel processes. This makes it easier to restart one without killing the other:

```bash
pnpm run python-devserver  # Django server on port 8000
pnpm run watch             # Webpack watcher for frontend assets
```

Both must be running for a fully functional dev environment. Alternatively, `pnpm run devserver` runs them together, but if one fails it kills both.

## Running Tests

**Python tests (pytest):**
```bash
pytest                                          # All backend tests
pytest kolibri/core/auth/test/test_api.py       # Specific test file
pytest kolibri/core/auth/test/ -k test_login    # Filter by test name
pytest kolibri/plugins/learn/test/              # Tests for a plugin
```

**Frontend tests (Jest):**
```bash
pnpm run test-jest                              # All frontend tests (single run)
pnpm run test                                   # All frontend tests (watch mode)
pnpm run test-jest -- --testPathPattern learn    # Tests matching "learn"
pnpm run test-jest -- path/to/__tests__/file.spec.js  # Specific test file
```

**Linting:**
```bash
pre-commit run --all-files  # Run all linting checks
```

## Coding Conventions

### Python

- **F-strings preferred**: Use f-strings for string formatting. Older code uses `.format()` but f-strings are now preferred for new code.
- **One import per line**: Write `from x import a` and `from x import b` on separate lines, not `from x import a, b`. Enforced by linting.
- **Inline imports only when necessary**: Only use inline/deferred imports to prevent circular imports or premature imports. All other imports go at the top of the file.
- **Logging**: Use `logger = logging.getLogger(__name__)` at module level.
- **Constants**: Define as uppercase strings in dedicated modules with `choices` tuples for Django model fields (see `kolibri/core/auth/constants/` for examples).
- **Custom model fields**: Use `DateTimeTzField` from `kolibri.core.fields` for timestamps (not Django's `DateTimeField`). Use `UUIDField` from morango for UUIDs on syncable models.
- **Model permissions**: Syncable models use declarative `RoleBasedPermissions` as a class attribute. Viewset permission classes extend `KolibriAuthPermissions` from `kolibri.core.auth.api`.
- **Error constants**: API validation errors should use codes from `kolibri/core/error_constants.py`, which are mirrored in frontend constants for consistent error handling.
- **Migration naming**: Must be descriptive (e.g., `0012_facilitydataset_allow_guest_access`). Pre-commit rejects auto-generated `_auto_` names.

### JavaScript / Vue

- **All user-visible text must be internationalized**: Never hard-code strings in templates. Use `createTranslator` and `$tr()` calls. In `setup()` functions, destructure the translator with `$` suffix:
  ```javascript
  const exampleStrings = createTranslator('ExampleStrings', {
    greeting: { message: 'Hello', context: 'Greeting label' },
  });
  const { greeting$ } = exampleStrings;
  // greeting$ is a function that returns the translated string
  ```
  → See `docs/i18n.rst` for full details
- **API calls via Resource classes**: Use `Resource` from `kolibri/apiResource` for all backend API calls. Define resources in `apiResources.js` files. Never use raw fetch or axios.
- **Component file naming**: PascalCase. Simple components: `MyComponent.vue`. Complex components with sub-components: `MyComponent/index.vue`. The component `name` property must match the file/directory name.

### General Code Quality

- **Keep code simple**: Prefer the simplest solution that achieves the goal. Code should be readable without extensive comments.
- **DRY, but avoid premature abstraction**: Don't repeat yourself and follow the Single Responsibility Principle, but don't abstract too early — wait until a pattern appears at least three times (Rule of Three).
- **Complete your refactors**: When changing a function signature, API, or pattern, update all usages — not just the one you're working on.
- **Accessibility**: Include appropriate `aria-*` attributes on interactive elements. Ensure keyboard navigation works.
- **Security**: API endpoints must have appropriate authentication and permissions. Validate submitted data. Don't bypass security practices (e.g., raw SQL instead of ORM queries).
- **Responsive design**: Consider different screen sizes and deployment contexts (including the Android app). Use `responsive-window` or `responsive-element` instead of media queries.
- **Test-Driven Development**: Whenever possible, use TDD with the Red/Green/Refactor cycle: write a failing test first (Red), write the minimum code to make it pass (Green), then clean up (Refactor). This is especially important for bug fixes — always write a test that reproduces the bug before fixing it. See `docs/testing.rst` for details.
- **One concern, one layer**: Don't reimplement validation, error handling, or permission logic that already exists at another layer. Choose the layer that owns the concern and trust it.
- **Preserve existing comments**: Don't strip comments to "clean up" a file. Only remove a comment if the code it describes has been deleted or the comment is provably incorrect. Update comments when modifying the code they describe.
- **Small interfaces**: If something can be private, it must be. A growing public API surface is a design smell.
- **Tests assert behavior, not implementation**: Test inputs and outputs. Mock only at hard boundaries (network, filesystem, external services). Don't mock internal modules to isolate units.
- **Identical code is not always duplication**: Don't extract shared code that merely looks similar but represents different domain concepts. Only deduplicate when the knowledge is genuinely the same.
- **Compute, don't store**: Don't add fields derivable from other fields. Use `computed()` in Vue or `annotate_queryset` in ValuesViewset for derived values.
- **Let errors propagate**: Don't wrap calls in try/catch that just log and rethrow. Let exceptions reach the layer that can actually handle them. DRF's exception handling already catches unhandled exceptions.
- **Tell, don't ask**: Don't inspect an object's state, make a decision, then update it. Tell the object what you want done and let it manage its own state.
- **Whoever allocates a resource releases it**: Use context managers in Python (`with`), `onUnmounted` cleanup in Vue composables. Don't split allocation and release across different functions.
- **Composition over inheritance**: Prefer composables over mixins, delegation over subclassing. Reserve inheritance for true "is-a" relationships with shallow hierarchies.
- **Externalize configuration**: Don't hardcode credentials, URLs, ports, or thresholds. Use Django settings or `kolibri.utils.conf.OPTIONS`.
- **Follow project vocabulary**: Use the same domain terms the codebase uses (`Collection`, `ContentNode`, `Facility`, `FacilityUser`). Don't introduce synonyms.
- **Don't weaken existing tests**: Do not modify or delete existing tests unless the behavior they test has been intentionally changed. If new code breaks existing tests, fix the code, not the tests.
- **Don't rely on undocumented behavior**: If a behavior isn't in the API contract or language spec, don't depend on it — even if it works today.
- **Escalate unclear decisions**: If you encounter an architectural or design decision not covered by documentation or existing patterns, ask rather than deciding independently. Every undocumented decision you make silently is a decision the team didn't get to weigh in on.

→ See `docs/code_quality.rst` for detailed explanations and Kolibri-specific examples of these principles

### Git

- **Commit messages**: Concise, imperative style (e.g., "Add search filtering to lesson list"). No conventional commit prefixes.
- **Commit organization**: Group commits in a logical order that invites commit-by-commit review, using the minimal number of commits appropriate for the scale of changes.
- **Formatting**: Python (Black) and JavaScript (Prettier) formatting is enforced automatically by pre-commit hooks.

## External Resources

- Design system: https://design-system.learningequality.org/
- User docs: https://kolibri.readthedocs.io/
