/**
 * Shared XML-string builders for QTI test specs.
 *
 * These produce raw XML fragments suitable for feeding to a DOMParser.
 * They replace the repeated hand-rolled `<qti-*-declaration>` strings that
 * previously appeared across evaluator, responseProcessing, useQTIContext,
 * variables, and the declarations/* specs.
 */

/**
 * Build a qti-response-declaration XML string.
 * @param {string} id - The declaration identifier
 * @param {string} baseType - The QTI base type
 * @param {string} [cardinality] - single, multiple, ordered, or record
 * @param {string} [children] - Inner declaration XML (e.g. mapping, correct-response)
 * @returns {string} qti-response-declaration XML
 */
export function responseDecl(id, baseType, cardinality = 'single', children = '') {
  return `<qti-response-declaration identifier="${id}" base-type="${baseType}" cardinality="${cardinality}">${children}</qti-response-declaration>`;
}

/**
 * Build a qti-outcome-declaration XML string.
 * @param {string} id - The declaration identifier
 * @param {string} baseType - The QTI base type
 * @param {string} [cardinality] - single, multiple, ordered, or record
 * @param {string} [children] - Inner declaration XML (e.g. default-value)
 * @returns {string} qti-outcome-declaration XML
 */
export function outcomeDecl(id, baseType, cardinality = 'single', children = '') {
  return `<qti-outcome-declaration identifier="${id}" base-type="${baseType}" cardinality="${cardinality}">${children}</qti-outcome-declaration>`;
}

/**
 * Build a qti-context-declaration XML string.
 * @param {string} id - The declaration identifier
 * @param {string} baseType - The QTI base type
 * @param {string} [cardinality] - single, multiple, ordered, or record
 * @param {string} [children] - Inner declaration XML
 * @returns {string} qti-context-declaration XML
 */
export function contextDecl(id, baseType, cardinality = 'single', children = '') {
  return `<qti-context-declaration identifier="${id}" base-type="${baseType}" cardinality="${cardinality}">${children}</qti-context-declaration>`;
}

/**
 * Build a qti-default-value XML string wrapping one qti-value.
 * @param {string|number} value - The default value text content
 * @returns {string} qti-default-value XML wrapping a single qti-value
 */
export function defaultValue(value) {
  return `<qti-default-value><qti-value>${value}</qti-value></qti-default-value>`;
}

/**
 * Build a qti-correct-response XML string with one qti-value per argument.
 * @param {...(string|number)} values - The correct value(s), one qti-value each
 * @returns {string} qti-correct-response XML wrapping one qti-value per argument
 */
export function correctResponse(...values) {
  return `<qti-correct-response>${values.map(v => `<qti-value>${v}</qti-value>`).join('')}</qti-correct-response>`;
}

/**
 * Wrap one or more declarations (and optional body content like response
 * processing rules or a set-outcome-value expression) in a qti-assessment-item.
 * @param {string|string[]} declarations - A single declaration XML or an array.
 * @param {string} [body] - Additional child XML (e.g. qti-response-processing).
 * @returns {string}
 */
export function itemXml(declarations, body = '') {
  const decls = Array.isArray(declarations) ? declarations.join('\n') : declarations;
  return `<qti-assessment-item>${decls}${body}</qti-assessment-item>`;
}

/**
 * Build a qti-base-value XML string.
 * @param {string} baseType - The QTI base type attribute
 * @param {string|number} value - The literal value text content
 * @returns {string} qti-base-value XML
 */
export function baseValue(baseType, value) {
  return `<qti-base-value base-type="${baseType}">${value}</qti-base-value>`;
}

/**
 * Build a qti-variable reference XML string.
 * @param {string} identifier - The referenced variable identifier
 * @returns {string} qti-variable XML (self-closing reference by identifier)
 */
export function variable(identifier) {
  return `<qti-variable identifier="${identifier}" />`;
}

/**
 * Build a qti-* expression element. Self-closes when no children.
 *
 * Usage:
 *   op('sum', baseValue('integer', 10), variable('A'))
 *   op('sum', { 'base-type': 'float' }, variable('A'))   // with attributes
 *   op('null')                                             // self-closing
 * @param {string} tag - Tag name without the qti- prefix.
 * @param {...(string|object)} args - An optional leading attrs object,
 * followed by child XML strings.
 * @returns {string}
 */
export function op(tag, ...args) {
  let attrs = '';
  let children = args;
  if (args.length > 0 && args[0] !== null && typeof args[0] === 'object') {
    attrs = Object.entries(args[0])
      .map(([k, v]) => ` ${k}="${v}"`)
      .join('');
    children = args.slice(1);
  }
  if (children.length === 0) {
    return `<qti-${tag}${attrs} />`;
  }
  return `<qti-${tag}${attrs}>${children.join('')}</qti-${tag}>`;
}
