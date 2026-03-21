/**
 * Unit tests for CorrectResponse declaration strategy.
 * Verifies that qti-correct-response elements are parsed and registered
 * as capabilities on the parent variable.
 */
import CorrectResponse from '../../declarations/correctResponse';
import { responseDecl, correctResponse } from '../qtiXmlHelpers';
import { createMockVariable } from './testSetup';

function buildCorrectResponse(baseType, cardinality, values) {
  const xml = responseDecl('RESPONSE', baseType, cardinality, correctResponse(...values));
  const { variable, doc } = createMockVariable(xml);
  new CorrectResponse(doc.querySelector('qti-correct-response'), variable);
  return variable;
}

describe('CorrectResponse', () => {
  it.each([
    // baseType, cardinality, values, expected
    ['identifier', 'single', ['A'], 'A'],
    ['integer', 'single', ['42'], 42],
    ['identifier', 'multiple', ['A', 'B', 'C'], ['A', 'B', 'C']],
    // Ordered preserves the original author-specified order.
    ['identifier', 'ordered', ['C', 'A', 'B'], ['C', 'A', 'B']],
  ])('should parse %s %s correct response', (baseType, cardinality, values, expected) => {
    const variable = buildCorrectResponse(baseType, cardinality, values);
    expect(variable.correctResponse).toEqual(expected);
  });
});
