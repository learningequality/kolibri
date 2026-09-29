import { computed, isRef, ref, shallowRef } from 'vue';

export const NO_OVERRIDE = Symbol('noOverride');

const RESERVED = new Set(['constructor', 'init']);

function isPrivate(key) {
  return key.startsWith('_');
}

export function asRef(value) {
  return isRef(value) ? value : ref(value);
}

function createRefSlot(value) {
  const version = shallowRef(0);
  let current = asRef(value);
  return {
    get ref() {
      version.value;
      return current;
    },
    set ref(newRef) {
      current = newRef;
      version.value++;
    },
  };
}

function defineRef(record, key, value) {
  const slot = createRefSlot(value);
  record.refs[key] = slot;
  Object.defineProperty(record.instance, key, {
    get: () => slot.ref.value,
    set: newValue => {
      if (isRef(newValue)) {
        slot.ref = newValue;
      } else {
        slot.ref.value = newValue;
      }
    },
    enumerable: true,
    configurable: true,
  });
}

function defineComputed(record, key, descriptor) {
  const { instance } = record;
  const override = shallowRef(NO_OVERRIDE);
  const get = () =>
    override.value === NO_OVERRIDE ? descriptor.get.call(instance) : override.value;
  const computedRef = descriptor.set
    ? computed({ get, set: value => descriptor.set.call(instance, value) })
    : computed(get);
  record.computed[key] = { ref: computedRef, override, writable: Boolean(descriptor.set) };
  Object.defineProperty(instance, key, {
    get: () => computedRef.value,
    set: descriptor.set
      ? value => {
          computedRef.value = value;
        }
      : undefined,
    configurable: true,
  });
}

function defineMethod(record, key, definition, methodWrappers) {
  const { instance } = record;
  const run = (...args) => definition.apply(instance, args);
  record.implementations[key] = run;
  const method = methodWrappers.reduce((wrapped, wrap) => wrap(record, key, wrapped), run);
  record.methods[key] = { invoke: method, definition };
  Object.defineProperty(instance, key, { value: method, writable: true, configurable: true });
}

function readOwnFields(record, methodWrappers) {
  for (const key of Object.keys(record.instance)) {
    if (RESERVED.has(key)) {
      continue;
    }
    const value = record.instance[key];
    if (typeof value === 'function') {
      defineMethod(record, key, value, methodWrappers);
    } else if (value && value.__v_skip) {
      record.raw[key] = value;
    } else {
      defineRef(record, key, value);
    }
  }
}

function readPrototypeMembers(record, basePrototype, methodWrappers) {
  const seen = new Set(Object.keys(record.instance));
  let prototype = Object.getPrototypeOf(record.instance);
  while (prototype && prototype !== basePrototype) {
    for (const key of Object.getOwnPropertyNames(prototype)) {
      if (RESERVED.has(key) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
      if (descriptor.get) {
        defineComputed(record, key, descriptor);
      } else if (typeof descriptor.value === 'function') {
        defineMethod(record, key, descriptor.value, methodWrappers);
      }
    }
    prototype = Object.getPrototypeOf(prototype);
  }
}

export function readMembers(record, basePrototype, methodWrappers) {
  readOwnFields(record, methodWrappers);
  readPrototypeMembers(record, basePrototype, methodWrappers);
}

export function buildConsumer(record) {
  const consumer = {};
  for (const [key, slot] of Object.entries(record.refs)) {
    if (!isPrivate(key)) {
      consumer[key] = computed({
        get: () => slot.ref.value,
        set: value => {
          slot.ref.value = value;
        },
      });
    }
  }
  for (const [key, entry] of Object.entries(record.computed)) {
    if (!isPrivate(key)) {
      consumer[key] = entry.ref;
    }
  }
  for (const [key, { invoke }] of Object.entries(record.methods)) {
    if (!isPrivate(key)) {
      consumer[key] = invoke;
    }
  }
  for (const [key, value] of Object.entries(record.raw)) {
    if (!isPrivate(key)) {
      consumer[key] = value;
    }
  }
  return consumer;
}
