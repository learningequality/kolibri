@AGENTS.md

## Extended Conventions

These supplement the gotchas in AGENTS.md. With Claude's large context window, the additional detail has negligible cost.

### Code Quality Principles

- **Compute, don't store**: Don't add DB fields derivable from other fields. Use `computed()` in Vue, `annotate_queryset` in ValuesViewset.
- **Let errors propagate**: Don't wrap calls in try/catch that just log and rethrow. DRF's exception handling catches unhandled exceptions.
- **Composition over inheritance**: Prefer composables over mixins, delegation over subclassing. Reserve inheritance for true is-a relationships.
- **Tell, don't ask**: Don't inspect state → decide → update. Tell the object what to do.
- **Tests assert behavior, not implementation**: Mock only at hard boundaries (network, filesystem, external services).
- **Follow project vocabulary**: Use `Collection`, `ContentNode`, `Facility`, `FacilityUser`. Don't introduce synonyms.
- **Escalate unclear decisions**: If an architectural choice isn't covered by docs or existing patterns, ask rather than deciding independently.
- **Don't weaken existing tests**: Only modify tests when the tested behavior has intentionally changed.
- **Small interfaces**: If something can be private, it must be.
- **Externalize configuration**: Use Django settings or `kolibri.utils.conf.OPTIONS`, not hardcoded values.
- **Accessibility**: `aria-*` attributes on interactive elements. Keyboard navigation must work.
- **Identical code is not always duplication**: Only deduplicate when the knowledge is genuinely the same, not just when code looks similar.
- **Keep code simple**: Prefer the simplest solution that achieves the goal. Code should be readable without extensive comments.
- **DRY, but avoid premature abstraction**: Don't abstract too early — wait until a pattern appears at least three times (Rule of Three).
- **Complete your refactors**: When changing a function signature, API, or pattern, update all usages — not just the one you're working on.
- **Security**: API endpoints must have appropriate authentication and permissions. Validate submitted data. Don't bypass security practices (e.g., raw SQL instead of ORM queries).
- **One concern, one layer**: Don't reimplement validation, error handling, or permission logic that already exists at another layer.
- **Preserve existing comments**: Don't strip comments to "clean up." Only remove when the described code is deleted or the comment is provably incorrect.
- **Don't rely on undocumented behavior**: If a behavior isn't in the API contract or language spec, don't depend on it.
- **Whoever allocates a resource releases it**: Use context managers in Python (`with`), `onUnmounted` cleanup in Vue composables.

→ See `docs/code_quality.rst` for detailed Kolibri-specific examples

### Python Conventions (Extended)

- **Logging**: `logger = logging.getLogger(__name__)` at module level.
- **Constants**: Uppercase strings in dedicated modules with `choices` tuples for model fields (see `kolibri/core/auth/constants/`).
- **Model permissions**: Syncable models use declarative `RoleBasedPermissions`. Viewsets use `KolibriAuthPermissions` from `kolibri.core.auth.api`.
- **Error constants**: API validation errors use codes from `kolibri/core/error_constants.py`, mirrored in frontend.

### Multi-Agent / Multi-Worktree Isolation

→ See `docs/howtos/multi_agent_setup.md` for full setup including KOLIBRI_HOME isolation and unique ports.
