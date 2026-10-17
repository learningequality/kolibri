import path from 'node:path';
import { effectScope } from 'vue';
import GlobalStore from 'kolibri/composables/GlobalStore';

function requireInternal(name) {
  return require(
    path.join(path.dirname(require.resolve('kolibri/package.json')), 'composables/internal', name),
  );
}

const { resetDependencies } = requireInternal('composableDependencies');
const { NO_OVERRIDE, readMembers } = requireInternal('composableMembers');
const { ComposableBase, build, globalRecords, hooks } = requireInternal('composableRuntime');

const stubbedClasses = new Set();
const localRefOverrides = new Map();
const liveLocalRecords = new Set();
const spies = new WeakMap();
const resetScopes = new WeakMap();

function stub() {
  return undefined;
}

function defaultImplementation(record, key) {
  return stubbedClasses.has(record.Class) ? stub : record.implementations[key];
}

function isGlobal(Class) {
  return Object.prototype.isPrototypeOf.call(GlobalStore, Class);
}

function recordsFor(Class) {
  if (isGlobal(Class)) {
    Class.use();
    return [...globalRecords.values()].filter(record => record.Class === Class);
  }
  return [...liveLocalRecords].filter(record => record.Class === Class);
}

function assertMockable(Class, record, values) {
  for (const key of Object.keys(values)) {
    if (!(key in record.refs) && !(key in record.computed)) {
      throw new Error(`${Class.name} has no ref or computed named ${key}`);
    }
  }
}

function applyRefs(record, values) {
  assertMockable(record.Class, record, values);
  for (const [key, value] of Object.entries(values)) {
    if (key in record.refs) {
      record.refs[key].ref.value = value;
    } else {
      record.computed[key].override.value = value;
    }
  }
}

function membersOf(Class) {
  const scope = effectScope(true);
  const members = scope.run(() => {
    const record = {
      instance: new Class(),
      refs: {},
      computed: {},
      methods: {},
      implementations: {},
      raw: {},
    };
    readMembers(record, ComposableBase.prototype, []);
    return record;
  });
  scope.stop();
  return members;
}

function freshRecord(record) {
  resetScopes.get(record)?.stop();
  const scope = record.scope.run(() => effectScope());
  resetScopes.set(record, scope);
  return scope.run(() => build(record.Class, [], null));
}

function resetRecord(record) {
  const fresh = freshRecord(record);
  for (const [key, slot] of Object.entries(record.refs)) {
    slot.ref = fresh.refs[key].ref;
  }
  for (const { override } of Object.values(record.computed)) {
    override.value = NO_OVERRIDE;
  }
  for (const [key, spy] of spies.get(record) || []) {
    spy.mockReset();
    spy.mockImplementation(defaultImplementation(record, key));
  }
  resetDependencies(record);
}

export function installComposableTesting() {
  hooks.methodWrappers.push((record, key) => {
    const spy = jest.fn(defaultImplementation(record, key)); // eslint-disable-line no-undef
    spies.set(record, (spies.get(record) || new Map()).set(key, spy));
    return spy;
  });
  hooks.created.push(record => {
    if (!isGlobal(record.Class)) {
      liveLocalRecords.add(record);
      applyRefs(record, localRefOverrides.get(record.Class) || {});
    }
  });
  hooks.disposed.push(record => liveLocalRecords.delete(record));
  hooks.testing = { mock: mockComposable, stub: stubComposable };
  // Testing Library unmounts in its own afterEach, after this setup file's, so resetting there
  // would re-render components still mounted from the finished test.
  global.beforeEach(() => {
    globalRecords.forEach(resetRecord);
    localRefOverrides.clear();
    liveLocalRecords.clear();
  });
}

function stubComposable(Class) {
  stubbedClasses.add(Class);
  for (const record of recordsFor(Class)) {
    for (const spy of (spies.get(record) || new Map()).values()) {
      spy.mockImplementation(stub);
    }
  }
}

function mockComposable(Class, values) {
  if (!isGlobal(Class)) {
    assertMockable(Class, membersOf(Class), values);
    localRefOverrides.set(Class, { ...localRefOverrides.get(Class), ...values });
  }
  for (const record of recordsFor(Class)) {
    applyRefs(record, values);
  }
}
