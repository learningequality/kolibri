/**
 * Tests for QTI XML utilities — loadQTIPackage and parseXML.
 * jsdom test env provides DOMParser natively.
 */

import { parseXML, loadQTIPackage } from '../xml';

// Staging area: tests set this before calling loadQTIPackage, and the
// mock ZipFile constructor reads it.
let mockZipFiles = {};

jest.mock('kolibri-zip', () => {
  return {
    __esModule: true,
    default: class FakeZipFile {
      constructor() {
        this._files = mockZipFiles;
      }
      file(filename) {
        const content = this._files[filename];
        if (content === undefined) {
          return Promise.reject(new Error(`File not found: ${filename}`));
        }
        return Promise.resolve({ toString: () => content });
      }
    },
  };
});

// Helper: build a minimal IMS manifest with given resources
function manifest(resources) {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <manifest>
      <resources>
        ${resources}
      </resources>
    </manifest>`;
}

describe('parseXML', () => {
  it('should parse valid XML', () => {
    const doc = parseXML('<root><child>text</child></root>');
    expect(doc.documentElement.tagName).toBe('root');
  });

  it('should throw on invalid XML', () => {
    expect(() => parseXML('<root><unclosed>')).toThrow('XML parsing error');
  });
});

describe('loadQTIPackage', () => {
  it('should return resourcesMap and qtiPackage from a manifest', async () => {
    mockZipFiles = {
      'imsmanifest.xml': manifest(`
        <resource identifier="item1" type="imsqti_item_xmlv3p0" href="item1.xml" />
      `),
    };

    const result = await loadQTIPackage('fake://url');
    expect(result.resourcesMap).toBeDefined();
    expect(result.resourcesMap.item1).toEqual({
      identifier: 'item1',
      type: 'imsqti_item_xmlv3p0',
      href: 'item1.xml',
      files: [],
    });
    expect(result.qtiPackage).toBeDefined();
    expect(typeof result.qtiPackage.getResponseProcessingNode).toBe('function');
  });

  it('should resolve a custom response processing template on demand from the zip', async () => {
    const customTemplateXml = `<qti-response-processing>
      <qti-response-condition>
        <qti-response-if>
          <qti-match>
            <qti-variable identifier="RESPONSE"/>
            <qti-correct identifier="RESPONSE"/>
          </qti-match>
          <qti-set-outcome-value identifier="SCORE">
            <qti-base-value base-type="float">5</qti-base-value>
          </qti-set-outcome-value>
        </qti-response-if>
      </qti-response-condition>
    </qti-response-processing>`;

    mockZipFiles = {
      'imsmanifest.xml': manifest(`
        <resource identifier="item1" type="imsqti_item_xmlv3p0" href="item1.xml" />
        <resource identifier="rpt1" type="imsqti_rptemplate_xmlv3p0" href="templates/custom_rp.xml" />
      `),
      'templates/custom_rp.xml': customTemplateXml,
    };

    const result = await loadQTIPackage('fake://url');

    // Should resolve the template by its href path (async - fetches from zip on demand)
    const node = await result.qtiPackage.getResponseProcessingNode('templates/custom_rp.xml');
    expect(node).not.toBeNull();
    expect(node.tagName.toLowerCase()).toBe('qti-response-processing');

    // Should return null for unknown URIs
    expect(await result.qtiPackage.getResponseProcessingNode('nonexistent.xml')).toBeNull();
  });
});
