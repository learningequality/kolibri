import path from 'node:path';
import { effectScope } from 'vue';
import GlobalStore from 'kolibri/composables/GlobalStore';

function requireInternal(name) {
  return require(
    path.join(path.dirname(require.resolve('kolibri/package.json')), 'composables/internal', name),
  );
}

const { resetDependencies } = requireInternal('composableDependencies');
const { NO_OVERRIDE, asRef, readMembers } = requireInternal('composableMembers');
const { ComposableBase, globalRecords, hooks, runInit } = requireInternal('composableRuntime');

const stubbedClasses = new Set();
const localRefOverrides = new Map();
const liveLocalRecords = new Set();
const spies = new WeakMap();
let inTest = false;

function stub() {
  return undefined;
}

function defaultImplementation(record, key) {
  return stubbedClasses.has(record.Class) ? stub : record.implementations[key];
}

function isGlobal(Class) {
  return Object.prototype.isPrototypeOf.call(GlobalStore, Class);
}

function existingRecords(Class) {
  return [...globalRecords.values(), ...liveLocalRecords].filter(record => record.Class === Class);
}

function recordsFor(Class) {
  if (isGlobal(Class)) {
    Class.use();
  }
  return existingRecords(Class);
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

function readClassMembers(Class) {
  const record = {
    instance: new Class(),
    refs: {},
    computed: {},
    methods: {},
    implementations: {},
    raw: new Set(),
  };
  readMembers(record, ComposableBase.prototype, []);
  return record;
}

function membersOf(Class) {
  const scope = effectScope(true);
  try {
    return scope.run(() => readClassMembers(Class));
  } finally {
    scope.stop();
  }
}

function membersOutsideComponent(Class) {
  try {
    return membersOf(Class);
  } catch {
    return null;
  }
}

function freshFieldValues(record) {
  record.fieldScope.stop();
  record.fieldScope = record.scope.run(() => effectScope());
  const fresh = record.fieldScope.run(() => new record.Class());
  const values = { ...fresh };
  for (const key of Object.keys(fresh)) {
    delete fresh[key];
  }
  for (const key of record.raw) {
    Object.defineProperty(fresh, key, {
      get: () => record.instance[key],
      set: value => {
        record.instance[key] = value;
      },
    });
  }
  Object.setPrototypeOf(fresh, record.instance);
  Object.preventExtensions(fresh);
  return values;
}

function resetRecord(record) {
  record.initScope.stop();
  const values = freshFieldValues(record);
  for (const [key, slot] of Object.entries(record.refs)) {
    slot.ref = asRef(values[key]);
  }
  for (const key of record.raw) {
    record.instance[key] = values[key];
  }
  for (const { override } of Object.values(record.computed)) {
    override.value = NO_OVERRIDE;
  }
  for (const [key, spy] of spies.get(record) || []) {
    spy.mockReset();
    spy.mockImplementation(defaultImplementation(record, key));
  }
  resetDependencies(record);
  record.scope.run(() => runInit(record, []));
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
    inTest = true;
  });
  global.afterEach(() => {
    inTest = false;
  });
}

function stubComposable(Class) {
  stubbedClasses.add(Class);
  for (const record of existingRecords(Class)) {
    for (const spy of (spies.get(record) || new Map()).values()) {
      spy.mockImplementation(stub);
    }
  }
}

function mockComposable(Class, values) {
  if (!inTest) {
    throw new Error(
      `${Class.name}.mock() only applies inside a test or beforeEach: the reset before each test undoes it`,
    );
  }
  if (!isGlobal(Class)) {
    const members = existingRecords(Class)[0] || membersOutsideComponent(Class);
    if (members) {
      assertMockable(Class, members, values);
    }
    localRefOverrides.set(Class, { ...localRefOverrides.get(Class), ...values });
  }
  for (const record of recordsFor(Class)) {
    applyRefs(record, values);
  }
}
