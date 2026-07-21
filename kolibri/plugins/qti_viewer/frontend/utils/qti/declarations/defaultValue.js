/**
 * DefaultValue declaration strategy.
 * Parses a qti-default-value XML element and registers the parsed
 * value as a capability on the parent QTIVariable.
 */
import { CAPABILITY } from './capabilities.js';

export default class DefaultValue {
  /**
   * Parses the default value and registers it as the default-value capability.
   * @param {Element} xmlNode - The qti-default-value XML element
   * @param {import('../variables.js').QTIVariable} variable - The parent variable to register on
   */
  constructor(xmlNode, variable) {
    const value = variable.parseValues(xmlNode);
    variable.registerCapability(CAPABILITY.DEFAULT_VALUE, () => value);
  }
}
