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

export default function useTypedProps(props) {
  const definitions = getCurrentInstance()?.proxy?.$options?.props || {};

  const typedProps = {};

  for (const key in props) {
    const propDef = definitions[key];

    typedProps[key] = computed(() => coerceValue(props[key], propDef));
  }

  return typedProps;
}
