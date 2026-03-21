/**
 * Unit tests for DefaultValue declaration strategy.
 * Verifies that qti-default-value elements are parsed and registered
 * as capabilities on the parent variable.
 */
import DefaultValue from '../../declarations/defaultValue';
import { outcomeDecl } from '../qtiXmlHelpers';
import { createMockVariable } from './testSetup';

function buildDefaultValue(baseType, cardinality, values, id = 'SCORE') {
  const inner = `<qti-default-value>${values.map(v => `<qti-value>${v}</qti-value>`).join('')}</qti-default-value>`;
  const xml = outcomeDecl(id, baseType, cardinality, inner);
  const { variable, doc } = createMockVariable(xml);
  new DefaultValue(doc.querySelector('qti-default-value'), variable);
  return variable;
}

describe('DefaultValue', () => {
  it.each([
    // baseType, cardinality, values, expected
    ['integer', 'single', ['50'], 50],
    ['float', 'single', ['3.14'], 3.14],
    ['string', 'single', ['hello'], 'hello'],
    ['boolean', 'single', ['true'], true],
    ['string', 'multiple', ['alpha', 'beta'], ['alpha', 'beta']],
  ])('should parse %s %s default value', (baseType, cardinality, values, expected) => {
    const variable = buildDefaultValue(baseType, cardinality, values);
    expect(variable.defaultValue).toEqual(expected);
  });
});
