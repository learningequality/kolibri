import { getCurrentScope, isRef, shallowRef } from 'vue';

const UNRESOLVED = Symbol('unresolved');

function unwrapView(consumer) {
  const view = {};
  for (const [key, value] of Object.entries(consumer)) {
    Object.defineProperty(
      view,
      key,
      isRef(value)
        ? {
            get: () => value.value,
            set: newValue => {
              value.value = newValue;
            },
            enumerable: true,
          }
        : { value, enumerable: true },
    );
  }
  return view;
}

export function isResolved(entry) {
  return entry.value !== UNRESOLVED;
}

export function resolveDependency(entry) {
  entry.version.value;
  if (entry.value === UNRESOLVED) {
    const resolve = () => unwrapView(entry.consume(entry.source));
    entry.value = entry.scope ? entry.scope.run(resolve) : resolve();
  }
  return entry.value;
}

export function defineDependencies(instance, dependencies = {}, consume) {
  const entries = {};
  for (const [key, source] of Object.entries(dependencies)) {
    const entry = {
      source,
      consume,
      scope: getCurrentScope(),
      version: shallowRef(0),
      value: UNRESOLVED,
    };
    entries[key] = entry;
    Object.defineProperty(instance, key, {
      get: () => resolveDependency(entry),
      configurable: true,
    });
  }
  return entries;
}

export function resetDependencies(record) {
  for (const entry of Object.values(record.dependencies)) {
    entry.value = UNRESOLVED;
    entry.version.value++;
  }
}
