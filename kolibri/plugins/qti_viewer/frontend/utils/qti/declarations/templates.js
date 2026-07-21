/**
 * QTI built-in response processing templates.
 *
 * Defines the three standard response processing templates from the QTI 3.0
 * specification as XML strings, and resolves template URIs to parsed DOM nodes.
 * The resolved nodes are processed by the standard response processing engine
 * — no special code path is needed for built-in templates.
 * @module declarations/templates
 */
import logger from 'kolibri-logging';
import { parseXML } from '../../xml.js';

const logging = logger.getLogger(__filename);

/**
 * The XML strings for the three QTI 3.0 built-in response processing templates.
 */
const matchCorrectXml = `<qti-response-processing>
  <qti-response-condition>
    <qti-response-if>
      <qti-match>
        <qti-variable identifier="RESPONSE"/>
        <qti-correct identifier="RESPONSE"/>
      </qti-match>
      <qti-set-outcome-value identifier="SCORE">
        <qti-base-value base-type="float">1</qti-base-value>
      </qti-set-outcome-value>
    </qti-response-if>
    <qti-response-else>
      <qti-set-outcome-value identifier="SCORE">
        <qti-base-value base-type="float">0</qti-base-value>
      </qti-set-outcome-value>
    </qti-response-else>
  </qti-response-condition>
</qti-response-processing>`;

const mapResponseXml = `<qti-response-processing>
  <qti-set-outcome-value identifier="SCORE">
    <qti-map-response identifier="RESPONSE"/>
  </qti-set-outcome-value>
</qti-response-processing>`;

const mapResponsePointXml = `<qti-response-processing>
  <qti-set-outcome-value identifier="SCORE">
    <qti-map-response-point identifier="RESPONSE"/>
  </qti-set-outcome-value>
</qti-response-processing>`;

/**
 * Built-in response processing templates keyed by their standard URIs.
 * Both the legacy (imsglobal.org) and current (purl.imsglobal.org) URI forms
 * are supported, as QTI content in the wild uses both.
 * @type {{[key: string]: string}}
 */
const builtinTemplates = {
  // Legacy URIs (QTI 2.x / early 3.0)
  'http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct': matchCorrectXml,
  'http://www.imsglobal.org/question/qti_v3p0/rptemplates/map_response': mapResponseXml,
  'http://www.imsglobal.org/question/qti_v3p0/rptemplates/map_response_point': mapResponsePointXml,
  // Current URIs (QTI 3.0 purl)
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml': matchCorrectXml,
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response.xml': mapResponseXml,
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response_point.xml':
    mapResponsePointXml,
};

/** @type {Map<string, Element>} Cached parsed DOM nodes for built-in templates */
const parsedTemplateCache = new Map();

/** @type {WeakMap<Element, Element>} Cached resolved RP nodes keyed by input element */
const resolvedNodeCache = new WeakMap();

/**
 * Resolve a response processing template URI to a parsed DOM node.
 *
 * First checks the built-in response processing templates defined in
 * v3 section 2.5.1
 *   https://www.imsglobal.org/spec/qti/v3p0/info/#RPTemplate
 * Built-in templates are parsed once and cached; a deep clone is returned
 * to prevent callers from mutating the cached node.
 * If no match, falls back to the optional qtiPackage for custom templates.
 * @param {string} uri - The template URI from the qti-response-processing element
 * @param {import('../../xml.js').QTIPackage} [qtiPackage] - Optional package for custom templates
 * @returns {Promise<Element|null>} The qti-response-processing DOM element, or null
 */
export async function resolveTemplate(uri, qtiPackage) {
  const xml = builtinTemplates[uri];
  if (xml) {
    if (!parsedTemplateCache.has(uri)) {
      parsedTemplateCache.set(uri, parseXML(xml).documentElement);
    }
    return parsedTemplateCache.get(uri).cloneNode(true);
  }
  return (await qtiPackage?.getResponseProcessingNode(uri)) ?? null;
}

/**
 * Resolve a qti-response-processing node, handling the template override rule.
 *
 * Per the "template" characteristic description in v3 section 4.6.1
 *   https://www.imsglobal.org/spec/qti/v3p0/info/#RootCharacteristic_ResponseProcessing.Attr_template
 * — "if both are given the internal rules are still preferred". The
 * template is only resolved when the element has no children.
 * @param {Element} responseProcessingNode - The qti-response-processing element
 * @param {import('../../xml.js').QTIPackage} [qtiPackage] - Optional package for custom templates
 * @returns {Promise<Element>} The node to process (original or resolved template)
 */
export async function resolveResponseProcessingNode(responseProcessingNode, qtiPackage) {
  const templateUri =
    responseProcessingNode.getAttribute('template') ||
    responseProcessingNode.getAttribute('template-location');
  if (templateUri && responseProcessingNode.children.length === 0) {
    const resolved = await resolveTemplate(templateUri, qtiPackage);
    if (resolved) {
      resolvedNodeCache.set(responseProcessingNode, resolved);
      return resolved;
    }
    logging.warn(`Unresolved response processing template URI: ${templateUri}`);
    resolvedNodeCache.set(responseProcessingNode, responseProcessingNode);
    return responseProcessingNode;
  }
  resolvedNodeCache.set(responseProcessingNode, responseProcessingNode);
  return responseProcessingNode;
}

/**
 * Get the resolved response processing node synchronously.
 *
 * Returns the cached result of a prior resolveResponseProcessingNode() call,
 * or the node itself if it has inline children (no async resolution needed).
 * Returns null if the template has not been resolved yet.
 * @param {Element} responseProcessingNode - The qti-response-processing element
 * @returns {Element|null} The resolved node, or null if not yet cached
 */
export function getResponseProcessingNode(responseProcessingNode) {
  const cached = resolvedNodeCache.get(responseProcessingNode);
  if (cached) return cached;

  // Inline rules don't need async resolution — cache and return directly
  if (
    (!responseProcessingNode.getAttribute('template') &&
      !responseProcessingNode.getAttribute('template-location')) ||
    responseProcessingNode.children.length > 0
  ) {
    resolvedNodeCache.set(responseProcessingNode, responseProcessingNode);
    return responseProcessingNode;
  }

  return null;
}
