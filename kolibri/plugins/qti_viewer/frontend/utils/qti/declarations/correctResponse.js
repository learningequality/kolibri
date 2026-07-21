/**
 * CorrectResponse declaration strategy.
 * Parses a qti-correct-response XML element and registers the parsed
 * value as a capability on the parent QTIVariable.
 */
import { CAPABILITY } from './capabilities.js';

export default class CorrectResponse {
  /**
   * Parses the correct response and registers it as the correct-response capability.
   * @param {Element} xmlNode - The qti-correct-response XML element
   * @param {import('../variables.js').QTIVariable} variable - The parent variable to register on
   */
  constructor(xmlNode, variable) {
    const value = variable.parseValues(xmlNode);
    variable.registerCapability(CAPABILITY.CORRECT_RESPONSE, () => value);
  }
}
