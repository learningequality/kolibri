import { computed, getCurrentInstance } from 'vue';
import isPlainObject from 'lodash/isPlainObject';
import { coerceBoolean, coerceNumber } from '../utils/qti/values';

function getTargetType(propDef) {
  if (!propDef) {
    return null;
  }
  if (typeof propDef === 'function') {
    return propDef;
  }

  if (Array.isArray(propDef)) {
    // Just return the first type in the array
    // As this mirrors VueJS' more restricted coersion logic
    return propDef[0];
  }

  if (isPlainObject(propDef)) {
    return getTargetType(propDef.type);
  }
  return String;
}

function coerceValue(value, propDef) {
  const targetType = getTargetType(propDef);

  switch (targetType) {
    case Boolean:
      return coerceBoolean(value);

    case Number:
      return coerceNumber(value);

    default:
      return value;
  }
}

/**
 * Wrap each field of the runtime `props` object in a computed ref that coerces
 * the raw value to its declared type. Useful when a QTI XML attribute arrives
 * as a string but the prop's declared type is `Boolean` or `Number` — the
 * returned computeds hand back properly typed values.
 *
 * Reads the component's prop definitions via `getCurrentInstance()`, so must
 * be called from a `setup()` context.
 * @param {object} props - The runtime props object from setup()
 * @returns {{[key: string]: import('vue').ComputedRef}} One ComputedRef per
 * prop key, keyed by the same identifiers as the input `props`.
 */
export default function useTypedProps(props) {
  const definitions = getCurrentInstance()?.proxy?.$options?.props || {};

  const typedProps = {};

  for (const key in props) {
    const propDef = definitions[key];

    typedProps[key] = computed(() => coerceValue(props[key], propDef));
  }

  return typedProps;
}
