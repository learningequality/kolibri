import { effectScope, getCurrentScope, isReactive, isReadonly, isRef, shallowRef } from 'vue';
import { isMarkedRaw } from './composableMembers';

const UNRESOLVED = Symbol('unresolved');

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isUnwrappable(result) {
  return (
    isPlainObject(result) &&
    !isRef(result) &&
    !isReactive(result) &&
    !isReadonly(result) &&
    !isMarkedRaw(result)
  );
}

function unwrapView(consumer) {
  const view = {};
  for (const [key, value] of Object.entries(consumer)) {
    const descriptor = isRef(value)
      ? { get: () => value.value, enumerable: true }
      : { get: () => consumer[key], enumerable: true };
    if (isRef(value) && !isReadonly(value)) {
      descriptor.set = newValue => {
        value.value = newValue;
      };
    }
    Object.defineProperty(view, key, descriptor);
  }
  return Object.preventExtensions(view);
}

export function isResolved(entry) {
  return entry.resolved.value;
}

export function resolveDependency(entry) {
  entry.version.value;
  if (entry.value === UNRESOLVED) {
    const scope = entry.scope ? entry.scope.run(() => effectScope()) : effectScope();
    let result;
    try {
      result = scope.run(() => entry.consume(entry.source));
    } catch (error) {
      scope.stop();
      throw error;
    }
    entry.resolveScope = scope;
    entry.result = result;
    entry.unwrapped = isUnwrappable(result);
    entry.value = entry.unwrapped ? unwrapView(result) : result;
    entry.resolved.value = true;
  }
  return entry.value;
}

export function defineDependencies(instance, dependencies = {}, consume) {
  const entries = {};
  for (const [key, source] of Object.entries(dependencies)) {
    if (key in instance) {
      throw new Error(
        `${instance.constructor.name} has a dependency and a member both named ${key}`,
      );
    }
    const entry = {
      source,
      consume,
      scope: getCurrentScope(),
      version: shallowRef(0),
      resolved: shallowRef(false),
      value: UNRESOLVED,
    };
    entries[key] = entry;
    Object.defineProperty(instance, key, {
      get: () => {
        const value = resolveDependency(entry);
        return isRef(value) ? value.value : value;
      },
      set: newValue => {
        const value = resolveDependency(entry);
        if (!isRef(value) || isReadonly(value)) {
          throw new TypeError(
            `${instance.constructor.name}.${key} is not a writable ref dependency`,
          );
        }
        value.value = newValue;
      },
      configurable: true,
    });
  }
  return entries;
}

export function resetDependencies(record) {
  for (const entry of Object.values(record.dependencies)) {
    entry.resolveScope?.stop();
    entry.value = UNRESOLVED;
    entry.resolved.value = false;
    entry.version.value++;
  }
}
