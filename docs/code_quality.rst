Code Quality
============

These principles guide how we write and review code in Kolibri. They apply across the full stack — Python, JavaScript, Vue, and infrastructure — and reflect patterns that have proven valuable in practice.

For language-specific conventions, see :doc:`frontend_architecture/conventions` and the coding conventions section in the project's ``AGENTS.md``.


Every concern lives at exactly one layer
-----------------------------------------

If a behavior like validation, retry, error handling, or permission checking is implemented at one layer, do not reimplement it at another. Choose the layer that owns the concern and trust it. Redundant implementations create conflicting behavior and obscure which layer is actually in control.

In Kolibri, this means:

- Permission checks belong in ``KolibriAuthPermissions`` and ``RoleBasedPermissions`` on models — not duplicated in frontend route guards and API views
- Validation logic belongs in serializers or model ``clean()`` methods — not scattered across both the viewset and the serializer
- Do not introduce global or shared mutable state to coordinate between modules. If two components need the same data, pass it explicitly or put it behind a single owner (e.g., a composable with module-level refs)


Prefer the simplest implementation that works
----------------------------------------------

Do not introduce abstraction layers until a concrete second use case demands it. Flat is better than nested. An ``if/else`` is better than a strategy pattern when there are two cases. Extract complexity only when it reduces total code.

Every layer, class, and indirection must justify its existence. Do not design for speculative future requirements — if a need has not materialized, the code to support it should not exist. When uncertain, make code easy to replace rather than easy to extend.


Preserve existing comments
--------------------------

Only remove a comment if it describes code that has been deleted or is provably incorrect. When modifying code that has comments, update the comments to reflect the changes. Do not strip comments to "clean up" a file.


Interfaces stay small
---------------------

Every public method needs justification. If something can be private, it must be. Push implementation details behind the interface boundary.

In Kolibri:

- Keep the ``values`` tuple in ``ValuesViewset`` minimal — only fetch fields that are actually needed
- Composables should return a focused public API — not expose every internal ref
- A growing public surface area is a design smell; refactor to reduce it before continuing


Tests assert behavior, not implementation
-----------------------------------------

Test inputs and outputs. Mock only at hard boundaries: network, filesystem, external services. Do not mock internal modules or classes to isolate units — test them through the real call chain. If refactoring working code breaks a test, the test was wrong, not the code.

In Kolibri:

- Frontend tests use `Vue Testing Library <https://testing-library.com/docs/vue-testing-library/intro>`__ which encourages testing from the user's perspective — query by text, role, and label rather than component internals
- Backend tests call API endpoints through Django's test client and assert on response data, not on internal method calls
- See :doc:`testing` for TDD principles and :doc:`backend_architecture/testing` for backend patterns


Identical code is only duplication if it changes for the same reason
--------------------------------------------------------------------

Do not extract shared functions or base classes from code that merely looks similar. Two pieces of code that happen to have the same implementation but represent different domain concepts must remain separate. Premature unification creates false coupling — when one concept's rules change, the shared abstraction becomes a liability.

Only deduplicate when the knowledge is genuinely the same. Three occurrences of a pattern (the "Rule of Three") is a reasonable threshold before extracting a shared abstraction.


Do not store what can be computed
---------------------------------

Do not add fields to data structures that are derivable from other fields in the same structure. Expose derived values as methods or computed properties.

In Kolibri:

- Use ``computed()`` in Vue composables for derived state rather than maintaining separate refs that must be kept in sync
- Use ``annotate_queryset`` in ``ValuesViewset`` for computed database fields rather than post-processing in Python
- If caching is needed for performance, keep the cached value private — never expose redundant state in the public interface


At system boundaries, generate shared representations
-----------------------------------------------------

When your code must mirror an external schema, API, or type definition, prefer generating the local representation from a shared source of truth (OpenAPI specs, database introspection, protobuf definitions, etc.). Do not manually duplicate type definitions, DTOs, or validation logic across boundaries.

In Kolibri, error constants in ``kolibri/core/error_constants.py`` are mirrored in frontend constants — if adding a new error constant, it must be added to both sides. If no generation tool exists, add a comment identifying the external source so reviewers can verify sync.


Let errors propagate
--------------------

Do not wrap every call in try/catch blocks that just log and rethrow, or that catch broad exception types only to obscure the original failure. Let exceptions propagate to the layer that can actually handle them meaningfully.

If something that "cannot happen" happens, crash — a dead program does less damage than a crippled one continuing to run on corrupted state. Only catch an exception if you have a specific recovery action for that specific failure mode.

In Kolibri, Django REST Framework's exception handling will catch unhandled exceptions and return appropriate error responses — there is no need to wrap every view method in a try/except.


Tell, don't ask
---------------

Do not reach into an object, inspect its internal state, make a decision based on that state, and then update the object. That pattern scatters the object's logic across its callers and makes the real rules invisible. Instead, tell the object what you want done and let it manage its own state.

In Kolibri:

- Use ``RoleBasedPermissions`` declaratively on models rather than checking roles manually in views
- Composables should expose actions (``fetchChannels()``) rather than forcing callers to manipulate internal refs directly
- Avoid method chains that traverse multiple levels of abstraction to reach into nested structures


Whoever allocates a resource is responsible for releasing it
------------------------------------------------------------

Do not open a file, connection, transaction, or handle in one function and close it in a different function. The function that acquires the resource should release it, using the language's appropriate scoping mechanism.

In Python, use context managers (``with`` statements) for files, database connections, and transactions. In JavaScript, use ``onUnmounted`` in composables to clean up event listeners, timers, and polling intervals that were set up in ``onMounted``.


Prefer composition over inheritance
------------------------------------

Do not use class inheritance to share behavior between types. Inheritance couples the child to the parent's implementation — when the parent changes, the child breaks silently.

In Kolibri:

- Vue composables are preferred over mixins for sharing component logic — composables use explicit composition rather than implicit merging
- Use interfaces or protocols to define shared behavior contracts, delegation to reuse implementation
- Reserve inheritance only for true "is-a" relationships where substitutability is required and the hierarchy is shallow (e.g., ``Facility`` extending ``Collection``)


Externalize values that change independently of code
----------------------------------------------------

Do not hardcode credentials, feature flags, environment-specific URLs, port numbers, logging levels, or business-rule thresholds as constants or literals in source code. Extract them to configuration that is loaded at startup.

In Kolibri, runtime configuration is managed through ``kolibri.utils.conf.OPTIONS`` and Django settings modules (``kolibri/deployment/default/settings/``). Plugin options use ``options.py`` files. Wrap configuration access behind a consistent API so code does not depend on how or where configuration is stored.


Follow existing naming conventions and project vocabulary
----------------------------------------------------------

Match the naming style of the language (``snake_case`` in Python, ``camelCase`` in JavaScript) and the conventions already established in the codebase. Use the same terms the project already uses for domain concepts — do not introduce synonyms.

In Kolibri:

- A group of learners is a ``Collection``, not a "group" or "class" (``Classroom`` is a specific kind of ``Collection``)
- Content items are ``ContentNode`` objects, not "resources" or "materials"
- Use ``Facility``, ``FacilityUser``, ``Classroom``, ``LearnerGroup`` — these are the established model names

Names should reveal intent: avoid generic names like ``data``, ``result``, ``info``, ``item``, or ``temp`` when a more specific name exists.


Do not weaken existing tests
----------------------------

Do not modify or delete existing tests unless the behavior they test has been intentionally changed. If new code breaks existing tests, fix the code, not the tests. Never loosen assertions, add workarounds, or reduce coverage to make a failing test pass.

Existing tests encode the team's understanding of correct behavior. Weakening them to accommodate new code masks regressions and erodes the test suite's value over time. If a test seems wrong, verify with the team before changing it.

See :doc:`testing` for TDD principles and general testing best practices.


Do not rely on undocumented behavior
------------------------------------

If a behavior is not specified in the API contract, language spec, or library documentation, do not depend on it — even if it works today. This includes assumptions about dictionary ordering, implicit type coercion, timing of concurrent operations, default values that are not documented, and the internal structure of third-party objects.

If you must rely on a specific behavior, assert it explicitly so failures are immediate and obvious rather than silent and delayed.
