/**
 * Tests for template resolver (declarations/templates.js).
 * Unit tests verify resolveTemplate returns parsed XML or null.
 * Integration tests verify full response processing through templates.
 */
import {
  resolveTemplate,
  resolveResponseProcessingNode,
  getResponseProcessingNode,
} from '../../declarations/templates.js';
import { processResponses } from '../../responseProcessing';
import { QTIVariable } from '../../variables';
import { responseDecl, correctResponse } from '../qtiXmlHelpers';
import { parser } from './testSetup';

const mockWarn = jest.fn();
jest.mock('kolibri-logging', () => ({
  getLogger: () => ({
    warn: (...args) => mockWarn(...args),
  }),
}));

/**
 * Build a response-declaration from XML and return its parsed QTIVariable.
 * @param {string} id - The declaration identifier
 * @param {string} baseType - The QTI base type
 * @param {string} cardinality - single, multiple, ordered, or record
 * @param {string} children - Inner declaration XML
 * @returns {import('../../variables.js').QTIVariable} The parsed variable
 */
function parseResponseDeclaration(id, baseType, cardinality, children) {
  const xml = responseDecl(id, baseType, cardinality, children);
  return new QTIVariable(parser.parseFromString(xml, 'text/xml').documentElement);
}

describe('resolveTemplate', () => {
  describe('unit tests', () => {
    it('should return a parsed XML node for match_correct URI', async () => {
      const node = await resolveTemplate(
        'http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct',
      );
      expect(node).not.toBeNull();
      expect(node.tagName.toLowerCase()).toBe('qti-response-processing');
    });

    it('should return a parsed XML node for map_response URI', async () => {
      const node = await resolveTemplate(
        'http://www.imsglobal.org/question/qti_v3p0/rptemplates/map_response',
      );
      expect(node).not.toBeNull();
      expect(node.tagName.toLowerCase()).toBe('qti-response-processing');
    });

    it('should return a parsed XML node for map_response_point URI', async () => {
      const node = await resolveTemplate(
        'http://www.imsglobal.org/question/qti_v3p0/rptemplates/map_response_point',
      );
      expect(node).not.toBeNull();
      expect(node.tagName.toLowerCase()).toBe('qti-response-processing');
    });

    it('should return null for unknown URI with no package', async () => {
      const node = await resolveTemplate('http://example.com/unknown_template');
      expect(node).toBeNull();
    });

    it('should resolve a custom template URI via qtiPackage', async () => {
      const customRpXml = `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">42</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`;
      const customDoc = parser.parseFromString(customRpXml, 'text/xml');
      const customNode = customDoc.documentElement;

      const qtiPackage = {
        async getResponseProcessingNode(uri) {
          if (uri === 'http://example.com/custom_template') {
            return customNode;
          }
          return null;
        },
      };

      const node = await resolveTemplate('http://example.com/custom_template', qtiPackage);
      expect(node).toBe(customNode);
    });
  });

  describe('integration: match_correct template', () => {
    it('should score 1 for correct answer and 0 for wrong', async () => {
      const declarations = {
        RESPONSE: parseResponseDeclaration(
          'RESPONSE',
          'identifier',
          'single',
          correctResponse('B'),
        ),
      };
      const outcomes = { SCORE: 0 };

      const rpNode = await resolveTemplate(
        'http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct',
      );

      // Correct answer
      const result1 = processResponses(rpNode, { RESPONSE: 'B' }, declarations, { ...outcomes });
      expect(result1.SCORE).toBe(1);

      // Wrong answer
      const result2 = processResponses(rpNode, { RESPONSE: 'A' }, declarations, { ...outcomes });
      expect(result2.SCORE).toBe(0);
    });
  });

  describe('integration: map_response template', () => {
    it('should produce the mapped score', async () => {
      const declarations = {
        RESPONSE: parseResponseDeclaration(
          'RESPONSE',
          'identifier',
          'single',
          `<qti-mapping default-value="0">
            <qti-map-entry map-key="A" mapped-value="2" />
            <qti-map-entry map-key="B" mapped-value="1" />
          </qti-mapping>`,
        ),
      };
      const outcomes = { SCORE: 0 };

      const rpNode = await resolveTemplate(
        'http://www.imsglobal.org/question/qti_v3p0/rptemplates/map_response',
      );

      const result = processResponses(rpNode, { RESPONSE: 'A' }, declarations, { ...outcomes });
      expect(result.SCORE).toBe(2);
    });
  });

  describe('inline rules override template', () => {
    it('should not resolve template when response-processing has child elements', async () => {
      // The "template" characteristic description — "if both are given the
      // internal rules are still preferred"; v3 section 4.6.1
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#RootCharacteristic_ResponseProcessing.Attr_template
      const rpXml = `<qti-response-processing template="http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct">
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">99</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`;
      const rpDoc = parser.parseFromString(rpXml, 'text/xml');
      const rpNode = rpDoc.documentElement;

      const resolved = await resolveResponseProcessingNode(rpNode);
      expect(resolved).toBe(rpNode);
    });

    it('should resolve template when response-processing has no child elements', async () => {
      const rpXml = `<qti-response-processing template="http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct" />`;
      const rpDoc = parser.parseFromString(rpXml, 'text/xml');
      const rpNode = rpDoc.documentElement;

      const resolved = await resolveResponseProcessingNode(rpNode);
      expect(resolved).not.toBe(rpNode);
      expect(resolved.tagName.toLowerCase()).toBe('qti-response-processing');
    });
  });

  describe('custom template via qtiPackage', () => {
    it('should resolve a custom template URI through resolveResponseProcessingNode', async () => {
      const customRpXml = `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">42</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`;
      const customDoc = parser.parseFromString(customRpXml, 'text/xml');
      const customNode = customDoc.documentElement;

      const qtiPackage = {
        async getResponseProcessingNode(uri) {
          if (uri === 'http://example.com/custom_rp') {
            return customNode;
          }
          return null;
        },
      };

      const rpXml = `<qti-response-processing template="http://example.com/custom_rp" />`;
      const rpDoc = parser.parseFromString(rpXml, 'text/xml');
      const rpNode = rpDoc.documentElement;

      const resolved = await resolveResponseProcessingNode(rpNode, qtiPackage);
      expect(resolved).toBe(customNode);
    });

    it('should process responses using a custom template from qtiPackage', async () => {
      // Custom template that always sets SCORE to 42
      const customRpXml = `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">42</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`;
      const customDoc = parser.parseFromString(customRpXml, 'text/xml');
      const customNode = customDoc.documentElement;

      const qtiPackage = {
        async getResponseProcessingNode(uri) {
          if (uri === 'http://example.com/custom_rp') {
            return customNode;
          }
          return null;
        },
      };

      const rpXml = `<qti-response-processing template="http://example.com/custom_rp" />`;
      const rpDoc = parser.parseFromString(rpXml, 'text/xml');
      const rpNode = rpDoc.documentElement;

      const resolved = await resolveResponseProcessingNode(rpNode, qtiPackage);
      const responseVar = parseResponseDeclaration(
        'RESPONSE',
        'identifier',
        'single',
        correctResponse('A'),
      );

      const result = processResponses(
        resolved,
        { RESPONSE: 'A' },
        { RESPONSE: responseVar },
        { SCORE: 0 },
      );
      expect(result.SCORE).toBe(42);
    });
  });

  describe('template-location attribute', () => {
    it('should resolve template-location when template attribute is absent', async () => {
      const customRpXml = `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">77</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`;
      const customDoc = parser.parseFromString(customRpXml, 'text/xml');
      const customNode = customDoc.documentElement;

      const qtiPackage = {
        async getResponseProcessingNode(uri) {
          if (uri === 'rp/custom_scoring.xml') {
            return customNode;
          }
          return null;
        },
      };

      const rpXml = `<qti-response-processing template-location="rp/custom_scoring.xml" />`;
      const rpDoc = parser.parseFromString(rpXml, 'text/xml');
      const rpNode = rpDoc.documentElement;

      const resolved = await resolveResponseProcessingNode(rpNode, qtiPackage);
      expect(resolved).toBe(customNode);
    });

    it('should prefer template over template-location when both are present', async () => {
      const rpXml = `<qti-response-processing template="http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct" template-location="rp/other.xml" />`;
      const rpDoc = parser.parseFromString(rpXml, 'text/xml');
      const rpNode = rpDoc.documentElement;

      const resolved = await resolveResponseProcessingNode(rpNode);
      expect(resolved).not.toBe(rpNode);
      expect(resolved.querySelector('qti-match')).not.toBeNull();
    });
  });

  describe('unresolved template URI', () => {
    it('should warn when template attribute is present but cannot be resolved', async () => {
      const rpXml = `<qti-response-processing template="http://example.com/custom/unknown_template" />`;
      const rpDoc = parser.parseFromString(rpXml, 'text/xml');
      const rpNode = rpDoc.documentElement;

      mockWarn.mockClear();
      const resolved = await resolveResponseProcessingNode(rpNode);
      // Should fall back to the original node
      expect(resolved).toBe(rpNode);
      // Should have logged a warning about the unresolved template
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining('http://example.com/custom/unknown_template'),
      );
    });
  });

  describe('getResponseProcessingNode', () => {
    it('should return inline rules synchronously without prior async call', () => {
      const rpXml = `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`;
      const rpDoc = parser.parseFromString(rpXml, 'text/xml');
      const rpNode = rpDoc.documentElement;

      const resolved = getResponseProcessingNode(rpNode);
      expect(resolved).toBe(rpNode);
    });

    it('should return null for uncached template URI', () => {
      const rpXml = `<qti-response-processing template="http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct" />`;
      const rpDoc = parser.parseFromString(rpXml, 'text/xml');
      const rpNode = rpDoc.documentElement;

      // Fresh node, not yet resolved — should return null
      const resolved = getResponseProcessingNode(rpNode);
      expect(resolved).toBeNull();
    });

    it('should return cached result after prior async resolution', async () => {
      const rpXml = `<qti-response-processing template="http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct" />`;
      const rpDoc = parser.parseFromString(rpXml, 'text/xml');
      const rpNode = rpDoc.documentElement;

      // Resolve async first (populates cache)
      await resolveResponseProcessingNode(rpNode);

      // Now sync should return the cached result
      const resolved = getResponseProcessingNode(rpNode);
      expect(resolved).not.toBeNull();
      expect(resolved.tagName.toLowerCase()).toBe('qti-response-processing');
    });
  });

  describe('integration: map_response_point template', () => {
    it('should produce the area-mapped score', async () => {
      const declarations = {
        RESPONSE: parseResponseDeclaration(
          'RESPONSE',
          'point',
          'single',
          `<qti-area-mapping default-value="0">
            <qti-area-map-entry shape="circle" coords="100,100,50" mapped-value="3" />
          </qti-area-mapping>`,
        ),
      };
      const outcomes = { SCORE: 0 };

      const rpNode = await resolveTemplate(
        'http://www.imsglobal.org/question/qti_v3p0/rptemplates/map_response_point',
      );

      const result = processResponses(rpNode, { RESPONSE: [100, 100] }, declarations, {
        ...outcomes,
      });
      expect(result.SCORE).toBe(3);
    });
  });
});
