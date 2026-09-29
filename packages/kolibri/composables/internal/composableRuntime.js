import { getCurrentInstance, getCurrentScope, onScopeDispose } from 'vue';
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
      `${Class.name}.${name}() is only available in Jest tests set up by kolibri-jest-config`,
    );
  }
  return hooks.testing[name];
}

export class ComposableBase {
  static get use() {
    if (!Object.hasOwn(this, BOUND_USE)) {
      this[BOUND_USE] = (...args) => this._use(...args);
    }
    return this[BOUND_USE];
  }

  static _use(...args) {
    const record = build(this, args);
    Object.values(record.dependencies).forEach(resolveDependency);
    return record.consumer;
  }

  /**
   * Sets refs and overrides computed values for the current test. For a local composable, the
   * values also apply to instances created later in the test.
   * @param {object} values - Ref or computed values by name.
   */
  static mock(values) {
    testingHelper(this, 'mock')(this, values);
  }

  /**
   * Replaces every method with a `jest.fn()` that returns undefined, for the rest of the test
   * file. Instances that already exist are stubbed too.
   */
  static stub() {
    testingHelper(this, 'stub')(this);
  }
}

export function build(Class, args, owner = getCurrentInstance()) {
  const instance = new Class();
  const record = {
    Class,
    id: Object.hasOwn(Class, COMPOSABLE_ID) ? Class[COMPOSABLE_ID] : null,
    instance,
    owner: owner ? owner.proxy : null,
    refs: {},
    computed: {},
    methods: {},
    implementations: {},
    raw: {},
  };
  readMembers(record, ComposableBase.prototype, hooks.methodWrappers);
  record.dependencies = defineDependencies(instance, Class.dependencies, consume);
  Object.preventExtensions(instance);
  record.consumer = buildConsumer(record);
  instance.init?.(...args);
  hooks.created.forEach(created => created(record));
  if (getCurrentScope()) {
    onScopeDispose(() => hooks.disposed.forEach(disposed => disposed(record)));
  }
  return record;
}
