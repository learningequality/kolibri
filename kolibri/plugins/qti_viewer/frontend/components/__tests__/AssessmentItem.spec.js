/**
 * Integration tests for AssessmentItem component
 * Tests that response processing produces correct outcomes via useQTIContext
 */
import { computed, nextTick, ref } from 'vue';
import { render } from '@testing-library/vue';
import AssessmentItem from '../AssessmentItem.vue';
import itemsMap from '../__fixtures__/items.js';
import { parseXML } from '../../utils/xml.js';

// Mock xml.js so tests don't pull in the real ZipFile / urls dependencies.
// The jsdom test env already provides a working DOMParser via the globalThis
// object; we access it as `globalThis.DOMParser` because Jest's factory-scoping
// rule only allows a short allowlist of bare identifiers.
jest.mock('../../utils/xml.js', () => ({
  parseXML: xmlString => {
    const xmlDoc = new globalThis.DOMParser().parseFromString(xmlString.trim(), 'text/xml');
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML parsing error: ${parserError.textContent}`);
    }
    return xmlDoc;
  },
}));

jest.mock('kolibri-logging', () => ({
  getLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Reference QTI 3.0 sample items with built-in response-processing templates.
const MATCH_CORRECT_XML =
  itemsMap['i9b-response-processing-fixed-template-match-correct-identifier'].xml;
const MAP_RESPONSE_XML =
  itemsMap['i9b-response-processing-fixed-template-map-response-identifier'].xml;

// Custom response-processing template used by the qtiPackage integration
// test: scores 5 when RESPONSE matches correct-response, else 0. Distinct
// from the built-in match_correct template (which scores 1).
const CUSTOM_SCORING_TEMPLATE_XML = `<qti-response-processing>
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
    <qti-response-else>
      <qti-set-outcome-value identifier="SCORE">
        <qti-base-value base-type="float">0</qti-base-value>
      </qti-set-outcome-value>
    </qti-response-else>
  </qti-response-condition>
</qti-response-processing>`;

// Minimal item with a single RESPONSE of the given base type and a SCORE
// outcome set by the given expression. Used for answer-state edge cases
// that the curated fixtures in items.js don't cover.
function minimalItemXml(baseType, scoreExpr) {
  return `
    <qti-assessment-item>
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="${baseType}" />
      <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0</qti-value></qti-default-value>
      </qti-outcome-declaration>
      <qti-item-body><p>Enter</p></qti-item-body>
      <qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">${scoreExpr}</qti-set-outcome-value>
      </qti-response-processing>
    </qti-assessment-item>
  `;
}

async function renderAssessmentItem(
  xml,
  { answerState = {}, interactive = true, qtiPackage = null } = {},
) {
  const xmlDoc = parseXML(xml);
  let checkAnswerFn = null;
  const interactionSpy = jest.fn();

  const wrapper = render(AssessmentItem, {
    props: { xmlDoc },
    provide: {
      qtiPackage,
      handlers: {
        interaction: interactionSpy,
        registerCheckAnswer: fn => {
          checkAnswerFn = fn;
        },
      },
      QTI_CONTEXT: computed(() => ({
        candidateIdentifier: 'test-user',
      })),
      answerState: ref(answerState),
      interactive: computed(() => interactive),
    },
  });

  // Wait for async template resolution to complete before returning
  await nextTick();

  return {
    wrapper,
    checkAnswer: () => checkAnswerFn(),
    interactionSpy,
    xmlDoc,
  };
}

describe('AssessmentItem', () => {
  describe('response processing integration', () => {
    it('should expose computed SCORE via response processing', async () => {
      const { checkAnswer } = await renderAssessmentItem(MATCH_CORRECT_XML);
      const result = checkAnswer();

      // Before any response is set, score should be 0 (default)
      expect(result.answerState).toBeDefined();
      expect(result).toHaveProperty('outcomes');
      expect(result.outcomes.SCORE).toBe(0);
    });

    it('should score correct response as 1 with match_correct template', async () => {
      // Inject the correct answer via answerState
      const answerState = { RESPONSE: 'choice_a' };
      const { checkAnswer } = await renderAssessmentItem(MATCH_CORRECT_XML, { answerState });
      const result = checkAnswer();
      expect(result.outcomes.SCORE).toBe(1);
    });

    it('should score incorrect response as 0 with match_correct template', async () => {
      const answerState = { RESPONSE: 'choice_b' };
      const { checkAnswer } = await renderAssessmentItem(MATCH_CORRECT_XML, { answerState });
      const result = checkAnswer();
      expect(result.outcomes.SCORE).toBe(0);
    });

    it('should compute mapped scores with map_response template', async () => {
      const answerState = { RESPONSE: ['choice_a', 'choice_b'] };
      const { checkAnswer } = await renderAssessmentItem(MAP_RESPONSE_XML, { answerState });
      const result = checkAnswer();
      // choice_a=1, choice_b=2, total=3, lower bound=0
      expect(result.outcomes.SCORE).toBe(3);
    });

    it('should apply lower bound with map_response template', async () => {
      // choice_d=-1 in the fixture; with lower-bound=0, the score clamps to 0.
      const answerState = { RESPONSE: ['choice_d'] };
      const { checkAnswer } = await renderAssessmentItem(MAP_RESPONSE_XML, { answerState });
      const result = checkAnswer();
      expect(result.outcomes.SCORE).toBe(0);
    });
  });

  describe('answer state', () => {
    it('should include response values in answerState', async () => {
      const answerState = { RESPONSE: 'choice_a' };
      const { checkAnswer } = await renderAssessmentItem(MATCH_CORRECT_XML, { answerState });

      const result = checkAnswer();
      expect(result.answerState.RESPONSE).toBe('choice_a');
    });

    it('should include QTI_CONTEXT in answerState', async () => {
      const { checkAnswer } = await renderAssessmentItem(MATCH_CORRECT_XML);

      const result = checkAnswer();
      expect(result.answerState.QTI_CONTEXT).toBeDefined();
      expect(result.answerState.QTI_CONTEXT.candidateIdentifier).toBe('test-user');
    });

    it('should restore empty string as a valid answer state value', async () => {
      const xml = minimalItemXml('string', '<qti-base-value base-type="float">1</qti-base-value>');
      const { checkAnswer } = await renderAssessmentItem(xml, { answerState: { RESPONSE: '' } });
      // Empty string is a valid string response and must not be reset to null.
      expect(checkAnswer().answerState.RESPONSE).toBe('');
    });

    it('should restore falsy-but-valid answer state values like integer 0', async () => {
      const xml = minimalItemXml('integer', '<qti-variable identifier="RESPONSE" />');
      const { checkAnswer } = await renderAssessmentItem(xml, { answerState: { RESPONSE: 0 } });
      expect(checkAnswer().answerState.RESPONSE).toBe(0);
    });

    it('should round-trip a schemaless record response (e.g. a custom interaction)', async () => {
      // A record RESPONSE with no declared field schema, as written by a custom
      // interaction: an arbitrary object with a nested answerState field.
      const xml = `
        <qti-assessment-item>
          <qti-response-declaration identifier="RESPONSE" cardinality="record" />
          <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
            <qti-default-value><qti-value>0</qti-value></qti-default-value>
          </qti-outcome-declaration>
          <qti-item-body><p>Embedded</p></qti-item-body>
          <qti-response-processing>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">0</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-processing>
        </qti-assessment-item>`;
      const responseRecord = { correct: true, simpleAnswer: '42', answerState: { widgets: {} } };
      const { checkAnswer } = await renderAssessmentItem(xml, {
        answerState: { RESPONSE: responseRecord },
      });
      expect(checkAnswer().answerState.RESPONSE).toEqual(responseRecord);
    });
  });

  describe('custom response processing templates via qtiPackage', () => {
    it('should resolve custom template URI through injected qtiPackage', async () => {
      const customUri = 'http://example.com/custom_scoring';
      const itemXml = MATCH_CORRECT_XML.replace(
        'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml',
        customUri,
      );
      const customNode = parseXML(CUSTOM_SCORING_TEMPLATE_XML).documentElement;
      const qtiPackage = {
        async getResponseProcessingNode(uri) {
          return uri === customUri ? customNode : null;
        },
      };

      const { checkAnswer } = await renderAssessmentItem(itemXml, {
        answerState: { RESPONSE: 'choice_a' },
        qtiPackage,
      });
      // Custom template scores 5 for correct answer, not 1 like match_correct
      expect(checkAnswer().outcomes.SCORE).toBe(5);
    });
  });
});
