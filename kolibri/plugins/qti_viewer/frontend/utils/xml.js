import ZipFile from 'kolibri-zip';

const domParser = new DOMParser();

// Simple XML parsing helper
export function parseXML(xmlString) {
  const xmlDoc = domParser.parseFromString(xmlString.trim(), 'text/xml');
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`XML parsing error: ${parserError.textContent}`);
  }
  return xmlDoc;
}

export async function loadQTIPackage(url) {
  const qtiZip = new ZipFile(url);
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
