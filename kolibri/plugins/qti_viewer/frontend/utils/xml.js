import ZipFile from 'kolibri-zip';
import urls from 'kolibri/urls';

// Module-scoped DOMParser: intentionally shared across all callers.
// DOMParser is stateless and reentrant, so a single instance is safe.
const domParser = new DOMParser();

/**
 * @typedef {object} QTIPackage
 * @property {(uri: string) => Promise<Element|null>} getResponseProcessingNode
 * Fetch and parse a response-processing template XML file from the package
 * zip by its manifest `uri`. Returns the cloned root element on hit, `null`
 * on miss (missing file, parse error). Results are cached per URI after
 * the first successful fetch.
 */

/**
 * @typedef {object} QTIResource
 * @property {string} identifier - The resource's manifest identifier
 * @property {string} type - MIME-style resource type from the IMS manifest
 * @property {string} href - Path to the resource inside the package zip
 */

/**
 * Parse an XML string into a DOM Document. Throws on malformed XML.
 * @param {string} xmlString - The raw XML text to parse
 * @returns {Document}
 * @throws {Error} when the parser emits a `parsererror` node
 */
export function parseXML(xmlString) {
  const xmlDoc = domParser.parseFromString(xmlString.trim(), 'text/xml');
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`XML parsing error: ${parserError.textContent}`);
  }
  return xmlDoc;
}

/**
 * Load a QTI package zip, parse its `imsmanifest.xml`, and build the lookup
 * surface components use to resolve resources and custom response-processing
 * templates.
 * @param {object} file - File descriptor with `storage_url` (and any fields
 * `urls.zipContentUrl` needs to build large-file URLs).
 * @returns {Promise<{resourcesMap: {[key: string]: QTIResource}, qtiPackage: QTIPackage}>}
 * @throws {Error} when the manifest contains zero resources
 */
export async function loadQTIPackage(file) {
  const qtiZip = new ZipFile(file.storage_url, {
    largeFileUrlGenerator: filepath => urls.zipContentUrl(file, filepath),
  });
  const manifestFile = await qtiZip.file('imsmanifest.xml');
  const manifestDoc = parseXML(manifestFile.toString());

  // Get all resources from manifest
  const resources = manifestDoc.querySelectorAll('manifest > resources > resource');

  // Build resource map keyed by identifier
  const newResourcesMap = {};
  for (const resource of resources) {
    const identifier = resource.getAttribute('identifier');
    if (identifier) {
      newResourcesMap[identifier] = {
        identifier,
        type: resource.getAttribute('type'),
        href: resource.getAttribute('href'),
      };
    }
  }

  if (Object.keys(newResourcesMap).length === 0) {
    throw new Error('IMS Package has no resources');
  }
  return newResourcesMap;
}
