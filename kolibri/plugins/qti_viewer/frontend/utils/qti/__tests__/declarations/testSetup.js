/**
 * Shared test setup for declaration strategy tests.
 * Provides a DOMParser instance and a helper to construct QTIVariable
 * instances from XML strings.
 */
import { QTIVariable } from '../../variables';

// jsdom test env provides DOMParser natively.
export const parser = new DOMParser();

/**
 * Create a QTIVariable from an XML string for testing declaration strategies.
 * @param {string} xmlString - Full XML declaration element
 * @returns {{ variable: QTIVariable, doc: Document }}
 */
export function createMockVariable(xmlString) {
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const variable = new QTIVariable(doc.documentElement);
  return { variable, doc };
}
