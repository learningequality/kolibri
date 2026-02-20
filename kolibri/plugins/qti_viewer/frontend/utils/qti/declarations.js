/**
 * QTI Variable Declaration System
 * Handles parsing and validation of QTI variable declarations
 */
import { ref } from 'vue';
import isFunction from 'lodash/isFunction';
import isPlainObject from 'lodash/isPlainObject';
import isArray from 'lodash/isArray';
import { BASE_TYPE } from '../../constants';
import { coerceValueWithBaseType } from './values';

export const CARDINALITY = {
  SINGLE: 'single',
  MULTIPLE: 'multiple',
  ORDERED: 'ordered',
  RECORD: 'record',
};

function parseFieldDeclarations(xmlNode) {
  const declarations = {};
  const valueNodes = xmlNode.querySelectorAll(
    'qti-default-value qti-value, qti-correct-response qti-value',
  );

  for (const valueNode of valueNodes) {
    const fieldId = valueNode.getAttribute('field-identifier');
    const baseType = valueNode.getAttribute('base-type');

    if (fieldId && baseType && !declarations[fieldId]) {
      declarations[fieldId] = new QTIVariable(valueNode);
    }
  }

  return Object.keys(declarations).length > 0 ? declarations : null;
}

const ARRAY_TYPES = new Set([BASE_TYPE.DIRECTED_PAIR, BASE_TYPE.PAIR, BASE_TYPE.POINT]);

export class QTIVariable {
  constructor(xmlNode, valueSetCallback) {
    // Handle both declaration nodes and value nodes (for field declarations)
    this.identifier =
      xmlNode.getAttribute('identifier') || xmlNode.getAttribute('field-identifier');
    this.baseType = xmlNode.getAttribute('base-type');
    this.cardinality = xmlNode.getAttribute('cardinality') || CARDINALITY.SINGLE;

    // Parse field declarations for record cardinality
    this.fieldDeclarations =
      this.cardinality === CARDINALITY.RECORD ? parseFieldDeclarations(xmlNode) : null;

    // Parse default value
    const defaultNode = xmlNode.querySelector('qti-default-value');
    this.defaultValue = defaultNode ? this.parseValues(defaultNode) : null;

    // Parse correct response
    const correctNode = xmlNode.querySelector('qti-correct-response');
    this.correctResponse = correctNode ? this.parseValues(correctNode) : null;

    // Parse mapping
    const mappingNode = xmlNode.querySelector('qti-mapping');
    this.mapping = mappingNode ? this.parseMapping(mappingNode) : null;

    // Parse area mapping
    const areaMappingNode = xmlNode.querySelector('qti-area-mapping');
    this.areaMapping = areaMappingNode ? this.parseAreaMapping(areaMappingNode) : null;

    this._value = ref(this.defaultValue);
    this._valueSetCallback = isFunction(valueSetCallback) ? valueSetCallback : () => {};
  }

  get value() {
    return this._value.value;
  }

  set value(newValue) {
    this._value.value = this.coerceValue(newValue);
    this._valueSetCallback();
  }

  reset() {
    this._value.value = this.defaultValue;
  }

  // Make it JSON-serializable for Jest
  toJSON() {
    return {
      value: this.value,
      identifier: this.identifier,
      baseType: this.baseType,
      cardinality: this.cardinality,
    };
  }

  parseValues(node) {
    if (this.cardinality === CARDINALITY.RECORD) {
      return this.parseRecordValues(node);
    }

    const textValues = [...node.querySelectorAll('qti-value')].map(v => v.textContent.trim());

    return this.coerceValue(textValues);
  }

  parseRecordValues(node) {
    const recordObject = {};

    if (this.fieldDeclarations) {
      for (const [fieldId, fieldDeclaration] of Object.entries(this.fieldDeclarations)) {
        const fieldValueNodes = [
          ...node.querySelectorAll(`qti-value[field-identifier="${fieldId}"]`),
        ];
        const values = fieldValueNodes.map(valueNode => valueNode.textContent.trim());

        if (values.length > 0) {
          recordObject[fieldId] = fieldDeclaration.coerceValue(values);
        }
      }
    }

    return recordObject;
  }

  coerceValue(values) {
    // Handle null/undefined/empty cases per QTI specification
    if (values === null || values === undefined || values === 'NULL' || values === '') {
      return null;
    }

    if (this.cardinality === CARDINALITY.SINGLE) {
      if (isArray(values)) {
        if ((!ARRAY_TYPES.has(this.baseType) && values.length > 1) || values.length > 2) {
          throw new TypeError('Multiple values passed to single cardinality');
        } else if (values.length === 1) {
          values = values[0];
        }
      }
      return coerceValueWithBaseType(values, this.baseType);
    } else if (this.cardinality === CARDINALITY.RECORD) {
      // For record cardinality, values should be a JavaScript object
      if (!isPlainObject(values)) {
        throw new TypeError('Record cardinality requires a JavaScript object');
      }

      const result = {};
      for (const [key, value] of Object.entries(values)) {
        const fieldDeclaration = this.fieldDeclarations?.[key];
        if (!fieldDeclaration) {
          throw new TypeError(`Field '${key}' is not defined in record declaration`);
        }
        result[key] = fieldDeclaration.coerceValue(value);
      }
      return result;
    } else {
      // Multiple or ordered cardinality
      const coercedValues = values.map(v => coerceValueWithBaseType(v, this.baseType));
      return coercedValues;
    }
  }

  parseMapping(node) {
    const entries = new Map();
    for (const entry of node.querySelectorAll('qti-map-entry')) {
      entries.set(entry.getAttribute('map-key'), {
        mappedValue: parseFloat(entry.getAttribute('mapped-value')),
      });
    }

    return {
      entries,
      defaultValue: parseFloat(node.getAttribute('default-value')) || 0,
    };
  }

  parseAreaMapping(node) {
    return {
      defaultValue: parseFloat(node.getAttribute('default-value')) || 0,
    };
  }
}

const numeric = new Set([BASE_TYPE.INTEGER, BASE_TYPE.FLOAT]);

// Pure functions for type compatibility checking
export function areTypesCompatible(typeA, typeB) {
  if (typeA === typeB) {
    return true;
  }

  // Numeric types are compatible
  if (numeric.has(typeA) && numeric.has(typeB)) {
    return true;
  }

  return false;
}

export function areDeclarationsCompatible(declA, declB) {
  if (declA.cardinality !== declB.cardinality) return false;
  return areTypesCompatible(declA.baseType, declB.baseType);
}
