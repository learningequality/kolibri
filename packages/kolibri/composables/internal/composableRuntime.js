import { effectScope, getCurrentInstance, getCurrentScope, onScopeDispose } from 'vue';
import { defineDependencies, resolveDependency } from './composableDependencies';
import { buildConsumer, readMembers } from './composableMembers';

export const COMPOSABLE_ID = Symbol.for('kolibri.composableId');

// Extension points for kolibri-jest-config (spies, mock and stub) and the devtools plugin.
export const hooks = {
  methodWrappers: [],
  created: [],
  disposed: [],
  testing: null,
};

// Keyed by build-time id: each plugin bundle has its own copy of a kolibri-common store class,
// and the shared id is what gives every copy the same instance.
export const globalRecords = new Map();

const BOUND_USE = Symbol('boundUse');

function consume(source) {
  return source.prototype instanceof ComposableBase ? source.use() : source();
}

function testingHelper(Class, name) {
  if (!hooks.testing) {
    throw new Error(
      `${Class.name}.${name}() is only available in Jest tests set up by kolibri-jest-config, and not on a module re-required under jest.isolateModules or jest.resetModules`,
    );
  }
  return hooks.testing[name];
}

/**
 * A composable written as a class. Export `Class.use` as the composable; each call creates an
 * instance.
 *
 * - Fields become refs, getters computed refs (writable with a setter) and methods wrapped
 *   functions. `markRaw` fields pass to consumers as they are.
 * - Members starting with `_` are hidden from consumers.
 * - `static dependencies` maps names to composable classes or function composables, available on
 *   `this`. A ref result is unwrapped, as are the refs in a plain object result. Assigning to a
 *   dependency, or to a key of a plain object result, writes an unwrapped writable ref and throws
 *   otherwise. Reactive, readonly and `markRaw` objects, and other results, pass through as they
 *   are. Local composables resolve them in `use()`, before `init`; global stores resolve them on
 *   first access.
 * - `init(...args)` runs once with `use()`'s arguments, after fields, getters, methods and
 *   dependencies are ready. Fields it assigns must be declared.
 * - Put component-bound calls, such as `inject` or `useRoute()`, in `static dependencies`.
 */
export class ComposableBase {
  static get use() {
    if (!Object.hasOwn(this, BOUND_USE)) {
      this[BOUND_USE] = (...args) => this._use(...args);
      this[BOUND_USE].composableClass = this;
    }
    return this[BOUND_USE];
  }

  static _use(...args) {
    return build(this, args, { eager: true }).consumer;
  }

  /**
   * Sets refs and overrides computed values for the current test. For a local composable, the
   * values also apply to instances created later in the test, once their `init` has run: `init`
   * sees the declared values, and its watchers on a mocked ref fire.
   *
   * Global stores are reset in place, and their `init` re-run, in a `beforeEach` that runs before
   * the spec's own, so field initializers and `init` see reset values, not that spec's mocks. Refs
   * shared with outside code keep the previous test's writes, and a spec's `jest.clearAllMocks()`
   * clears the calls `init` made.
   * @param {object} values - Ref or computed values by name.
   */
  static mock(values) {
    testingHelper(this, 'mock')(this, values);
  }

  /**
   * Replaces every method with a `jest.fn()` that returns undefined, for the rest of the test
   * file. Instances that already exist are stubbed too. Getters still run for real and resolve
   * real dependencies, so mock the computed values the code under test reads.
   *
   * Without `stub()`, methods are spies that call the real method. `jest.resetAllMocks()` and
   * `mockReset()` remove that implementation, so clear calls with `jest.clearAllMocks()` instead.
   */
  static stub() {
    testingHelper(this, 'stub')(this);
  }
}

export function runInit(record, args) {
  record.initScope = effectScope();
  record.initScope.run(() => record.instance.init?.(...args));
}

export function build(Class, args, { owner = getCurrentInstance(), eager = false } = {}) {
  const fieldScope = effectScope();
  const instance = fieldScope.run(() => new Class());
  const record = {
    Class,
    id: Object.hasOwn(Class, COMPOSABLE_ID) ? Class[COMPOSABLE_ID] : null,
    instance,
    fieldScope,
    owner: owner ? owner.proxy : null,
    refs: {},
    computed: {},
    methods: {},
    implementations: {},
    raw: new Set(),
  };
  readMembers(record, ComposableBase.prototype, hooks.methodWrappers);
  record.dependencies = defineDependencies(instance, Class.dependencies, consume);
  Object.preventExtensions(instance);
  record.consumer = buildConsumer(record);
  if (eager) {
    Object.values(record.dependencies).forEach(resolveDependency);
  }
  runInit(record, args);
  hooks.created.forEach(created => created(record));
  if (getCurrentScope()) {
    onScopeDispose(() => hooks.disposed.forEach(disposed => disposed(record)));
  }
  return record;
}
