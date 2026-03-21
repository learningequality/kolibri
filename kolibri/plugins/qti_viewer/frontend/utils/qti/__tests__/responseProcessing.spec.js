/**
 * Tests for QTI response processing module
 *
 * Test pattern: use parseAssessmentItem() with full QTI XML
 * (qti-assessment-item containing response/outcome declarations and
 * qti-response-processing rules). This exercises the real declaration
 * parsing pipeline rather than hand-constructing JS objects.
 */

// Mock xml.js with a real DOMParser implementation
import { parseXML } from '../../xml';
import { processResponses, ExitResponseException } from '../responseProcessing.js';
import { QTIVariable } from '../variables';
import { responseDecl, outcomeDecl, correctResponse, defaultValue, itemXml } from './qtiXmlHelpers';

const mockWarn = jest.fn();
jest.mock('kolibri-logging', () => ({
  getLogger: () => ({
    warn: (...args) => mockWarn(...args),
  }),
}));

// Mock xml.js so tests don't pull in the real ZipFile / urls dependencies.
// The jsdom test env already provides a working DOMParser, accessed via
// globalThis because Jest's factory-scoping rule only allowlists a small set
// of bare identifiers.
jest.mock('../../xml', () => ({
  parseXML: xmlString => {
    const xmlDoc = new globalThis.DOMParser().parseFromString(xmlString.trim(), 'text/xml');
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML parsing error: ${parserError.textContent}`);
    }
    return xmlDoc;
  },
}));

/**
 * Parse a full QTI assessment item XML and return declarations, variables, outcomes,
 * and the response processing node — ready for processResponses.
 * @param {string} xmlString - The assessment item XML to parse
 * @returns {{declarations: object, variables: object, outcomes: object, rpNode: Element}} Parsed
 * declarations, variable values, outcome values, and the response-processing node
 */
function parseAssessmentItem(xmlString) {
  const doc = parseXML(xmlString);
  const declarations = {};
  const variables = {};
  const outcomes = {};

  for (const node of doc.querySelectorAll('qti-response-declaration')) {
    const v = new QTIVariable(node);
    declarations[v.identifier] = v;
    variables[v.identifier] = v.value;
  }
  for (const node of doc.querySelectorAll('qti-outcome-declaration')) {
    const v = new QTIVariable(node);
    declarations[v.identifier] = v;
    outcomes[v.identifier] = v.value;
  }

  const rpNode = doc.querySelector('qti-response-processing');
  return { declarations, variables, outcomes, rpNode };
}

// Wrap declarations around a qti-response-processing block and parse.
function assessmentItem(declarations, rules) {
  return parseAssessmentItem(
    itemXml(declarations, `<qti-response-processing>${rules}</qti-response-processing>`),
  );
}

describe('processResponses', () => {
  describe('qti-set-outcome-value', () => {
    it('should set outcome to base value', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
        `<qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1.0</qti-base-value>
        </qti-set-outcome-value>`,
      );
      const result = processResponses(rpNode, variables, declarations, outcomes);
      expect(result.SCORE).toBe(1.0);
    });

    it('should set outcome based on variable expression', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          responseDecl('A', 'integer'),
          responseDecl('B', 'integer'),
          outcomeDecl('SCORE', 'integer', 'single', defaultValue(0)),
        ],
        `<qti-set-outcome-value identifier="SCORE">
          <qti-sum>
            <qti-variable identifier="A" />
            <qti-variable identifier="B" />
          </qti-sum>
        </qti-set-outcome-value>`,
      );
      variables.A = 10;
      variables.B = 20;
      const result = processResponses(rpNode, variables, declarations, outcomes);
      expect(result.SCORE).toBe(30);
    });

    it('should set multiple outcomes in sequence', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
          outcomeDecl('FEEDBACK', 'identifier'),
        ],
        `<qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1.0</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">correct</qti-base-value>
        </qti-set-outcome-value>`,
      );
      const result = processResponses(rpNode, variables, declarations, outcomes);
      expect(result.SCORE).toBe(1.0);
      expect(result.FEEDBACK).toBe('correct');
    });

    it('should allow outcome to reference its default value during processing', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
        `<qti-set-outcome-value identifier="SCORE">
          <qti-sum>
            <qti-variable identifier="SCORE" />
            <qti-base-value base-type="float">1.0</qti-base-value>
          </qti-sum>
        </qti-set-outcome-value>`,
      );
      // Non-adaptive items reset outcomes to defaults before each processing
      // run — v3 section 2.5
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#Main2p5
      // SCORE starts at default 0, so result is 0 + 1.0 = 1.0.
      outcomes.SCORE = 5.0;
      const result = processResponses(rpNode, variables, declarations, outcomes);
      expect(result.SCORE).toBe(1.0);
    });
    it('should log and skip when expression produces a type incompatible with the outcome', () => {
      // A string expression set into a boolean outcome should not crash processing.
      // Per defensive design: log the error and leave the outcome at its default.
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          outcomeDecl('PASSED', 'boolean', 'single', defaultValue('false')),
          outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
        ],
        `<qti-set-outcome-value identifier="PASSED">
          <qti-base-value base-type="string">not_a_boolean</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1.0</qti-base-value>
        </qti-set-outcome-value>`,
      );
      // Should not throw — the type error on PASSED should be logged and skipped,
      // and subsequent rules (setting SCORE) should still execute.
      const result = processResponses(rpNode, variables, declarations, outcomes);
      expect(result.PASSED).toBe(false); // remains at default
      expect(result.SCORE).toBe(1.0); // subsequent rule still runs
    });
  });

  describe('qti-response-condition', () => {
    it('should execute qti-response-else when condition is false', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          responseDecl('RESPONSE', 'identifier', 'single', correctResponse('A')),
          outcomeDecl('SCORE', 'float', 'single', defaultValue(-1)),
          outcomeDecl('FEEDBACK', 'identifier'),
        ],
        `<qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="RESPONSE" />
              <qti-correct identifier="RESPONSE" />
            </qti-match>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">1.0</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
          <qti-response-else>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">0.0</qti-base-value>
            </qti-set-outcome-value>
            <qti-set-outcome-value identifier="FEEDBACK">
              <qti-base-value base-type="identifier">incorrect</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-else>
        </qti-response-condition>`,
      );
      variables.RESPONSE = 'B';
      const result = processResponses(rpNode, variables, declarations, outcomes);
      expect(result.SCORE).toBe(0.0);
      expect(result.FEEDBACK).toBe('incorrect');
    });

    it('should execute first matching qti-response-else-if', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [responseDecl('SCORE_RAW', 'integer'), outcomeDecl('GRADE', 'identifier')],
        `<qti-response-condition>
          <qti-response-if>
            <qti-equal>
              <qti-variable identifier="SCORE_RAW" />
              <qti-base-value base-type="integer">3</qti-base-value>
            </qti-equal>
            <qti-set-outcome-value identifier="GRADE">
              <qti-base-value base-type="identifier">A</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
          <qti-response-else-if>
            <qti-equal>
              <qti-variable identifier="SCORE_RAW" />
              <qti-base-value base-type="integer">2</qti-base-value>
            </qti-equal>
            <qti-set-outcome-value identifier="GRADE">
              <qti-base-value base-type="identifier">B</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-else-if>
          <qti-response-else-if>
            <qti-equal>
              <qti-variable identifier="SCORE_RAW" />
              <qti-base-value base-type="integer">1</qti-base-value>
            </qti-equal>
            <qti-set-outcome-value identifier="GRADE">
              <qti-base-value base-type="identifier">C</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-else-if>
          <qti-response-else>
            <qti-set-outcome-value identifier="GRADE">
              <qti-base-value base-type="identifier">F</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-else>
        </qti-response-condition>`,
      );
      variables.SCORE_RAW = 2;
      expect(processResponses(rpNode, variables, declarations, outcomes).GRADE).toBe('B');

      variables.SCORE_RAW = 0;
      expect(processResponses(rpNode, variables, declarations, outcomes).GRADE).toBe('F');
    });

    it('should handle nested response conditions', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          responseDecl('RESPONSE', 'identifier', 'single', correctResponse('A')),
          outcomeDecl('SCORE', 'float', 'single', defaultValue(-1)),
        ],
        `<qti-response-condition>
          <qti-response-if>
            <qti-not>
              <qti-is-null>
                <qti-variable identifier="RESPONSE" />
              </qti-is-null>
            </qti-not>
            <qti-response-condition>
              <qti-response-if>
                <qti-match>
                  <qti-variable identifier="RESPONSE" />
                  <qti-correct identifier="RESPONSE" />
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                  <qti-base-value base-type="float">1.0</qti-base-value>
                </qti-set-outcome-value>
              </qti-response-if>
              <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                  <qti-base-value base-type="float">0.0</qti-base-value>
                </qti-set-outcome-value>
              </qti-response-else>
            </qti-response-condition>
          </qti-response-if>
        </qti-response-condition>`,
      );
      variables.RESPONSE = 'A';
      expect(processResponses(rpNode, variables, declarations, outcomes).SCORE).toBe(1.0);
    });

    it('should not execute inner rules when condition is null', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          responseDecl('NULL_VAR', 'boolean'),
          outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
        ],
        `<qti-response-condition>
          <qti-response-if>
            <qti-variable identifier="NULL_VAR" />
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">1.0</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
          <qti-response-else>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">-1.0</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-else>
        </qti-response-condition>`,
      );
      // null is treated as falsy, so else should execute
      expect(processResponses(rpNode, variables, declarations, outcomes).SCORE).toBe(-1.0);
    });
  });

  describe('qti-exit-response', () => {
    it('should exit response processing early', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
        `<qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1.0</qti-base-value>
        </qti-set-outcome-value>
        <qti-exit-response />
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">2.0</qti-base-value>
        </qti-set-outcome-value>`,
      );
      expect(processResponses(rpNode, variables, declarations, outcomes).SCORE).toBe(1.0);
    });

    it('should exit from within response condition', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          responseDecl('RESPONSE', 'identifier'),
          outcomeDecl('SCORE', 'float', 'single', defaultValue(-1)),
        ],
        `<qti-response-condition>
          <qti-response-if>
            <qti-is-null>
              <qti-variable identifier="RESPONSE" />
            </qti-is-null>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">0.0</qti-base-value>
            </qti-set-outcome-value>
            <qti-exit-response />
          </qti-response-if>
        </qti-response-condition>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1.0</qti-base-value>
        </qti-set-outcome-value>`,
      );
      // RESPONSE defaults to null, so exit branch triggers
      expect(processResponses(rpNode, variables, declarations, outcomes).SCORE).toBe(0.0);
    });

    it('should continue processing when exit not reached', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          responseDecl('RESPONSE', 'identifier'),
          outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
        ],
        `<qti-response-condition>
          <qti-response-if>
            <qti-is-null>
              <qti-variable identifier="RESPONSE" />
            </qti-is-null>
            <qti-exit-response />
          </qti-response-if>
        </qti-response-condition>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1.0</qti-base-value>
        </qti-set-outcome-value>`,
      );
      variables.RESPONSE = 'A';
      expect(processResponses(rpNode, variables, declarations, outcomes).SCORE).toBe(1.0);
    });
  });

  describe('multi-item scoring', () => {
    it('should handle multiple response conditions in sequence', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          responseDecl('RESPONSE1', 'identifier', 'single', correctResponse('A')),
          responseDecl('RESPONSE2', 'identifier', 'single', correctResponse('X')),
          outcomeDecl('SCORE1', 'float', 'single', defaultValue(0)),
          outcomeDecl('SCORE2', 'float', 'single', defaultValue(0)),
          outcomeDecl('TOTAL', 'float', 'single', defaultValue(0)),
        ],
        `<qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="RESPONSE1" />
              <qti-correct identifier="RESPONSE1" />
            </qti-match>
            <qti-set-outcome-value identifier="SCORE1">
              <qti-base-value base-type="float">1</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
        </qti-response-condition>
        <qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="RESPONSE2" />
              <qti-correct identifier="RESPONSE2" />
            </qti-match>
            <qti-set-outcome-value identifier="SCORE2">
              <qti-base-value base-type="float">1</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
        </qti-response-condition>
        <qti-set-outcome-value identifier="TOTAL">
          <qti-sum>
            <qti-variable identifier="SCORE1" />
            <qti-variable identifier="SCORE2" />
          </qti-sum>
        </qti-set-outcome-value>`,
      );
      variables.RESPONSE1 = 'A';
      variables.RESPONSE2 = 'B';
      const result = processResponses(rpNode, variables, declarations, outcomes);
      expect(result.SCORE1).toBe(1);
      expect(result.SCORE2).toBe(0);
      expect(result.TOTAL).toBe(1);
    });
  });

  describe('outcome reset for non-adaptive items', () => {
    it('should reset outcomes without explicit defaults to null before processing', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          responseDecl('RESPONSE', 'identifier', 'single', correctResponse('A')),
          outcomeDecl('FEEDBACK', 'identifier'),
        ],
        `<qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="RESPONSE" />
              <qti-correct identifier="RESPONSE" />
            </qti-match>
            <qti-set-outcome-value identifier="FEEDBACK">
              <qti-base-value base-type="identifier">correct</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
        </qti-response-condition>`,
      );

      // First run: correct answer sets FEEDBACK
      variables.RESPONSE = 'A';
      const result1 = processResponses(rpNode, variables, declarations, outcomes);
      expect(result1.FEEDBACK).toBe('correct');

      // Second run: wrong answer, FEEDBACK has no default declared, so the
      // outcome reset rule leaves it at NULL — v3 section 2.5
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#Main2p5
      variables.RESPONSE = 'B';
      const result2 = processResponses(rpNode, variables, declarations, result1);
      expect(result2.FEEDBACK).toBe(null);
    });

    it('should reset outcomes to defaults before processing', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          responseDecl('RESPONSE', 'identifier', 'single', correctResponse('A')),
          outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
        ],
        `<qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="RESPONSE" />
              <qti-correct identifier="RESPONSE" />
            </qti-match>
            <qti-set-outcome-value identifier="SCORE">
              <qti-sum>
                <qti-variable identifier="SCORE" />
                <qti-base-value base-type="float">1</qti-base-value>
              </qti-sum>
            </qti-set-outcome-value>
          </qti-response-if>
        </qti-response-condition>`,
      );

      variables.RESPONSE = 'A';

      // Pass outcomes with a stale value from a previous run. For
      // non-adaptive items, outcomes reset to their declared defaults
      // before each response processing invocation — v3 section 2.5
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#Main2p5
      // so SCORE should be 0+1=1, not 5+1=6.
      outcomes.SCORE = 5;
      const result = processResponses(rpNode, variables, declarations, outcomes);
      expect(result.SCORE).toBe(1);
    });

    it('should only return outcome keys that were passed in the outcomes parameter', () => {
      // The outcomes parameter is authoritative: processResponses should not
      // discover extra outcomes from declarations, because declarations may
      // contain response and context variables too.
      const doc = parseXML(`
        <qti-assessment-item>
          ${responseDecl('RESPONSE', 'identifier', 'single', correctResponse('A'))}
          ${outcomeDecl('SCORE', 'float', 'single', defaultValue(0))}
          ${outcomeDecl('FEEDBACK', 'identifier', 'single', defaultValue('none'))}
          <qti-response-processing>
            <qti-response-condition>
              <qti-response-if>
                <qti-match>
                  <qti-variable identifier="RESPONSE" />
                  <qti-correct identifier="RESPONSE" />
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                  <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                  <qti-base-value base-type="identifier">correct</qti-base-value>
                </qti-set-outcome-value>
              </qti-response-if>
            </qti-response-condition>
          </qti-response-processing>
        </qti-assessment-item>
      `);

      const declarations = {};
      const variables = {};
      for (const node of doc.querySelectorAll('qti-response-declaration')) {
        const v = new QTIVariable(node);
        declarations[v.identifier] = v;
        variables[v.identifier] = 'A';
      }
      for (const node of doc.querySelectorAll('qti-outcome-declaration')) {
        const v = new QTIVariable(node);
        declarations[v.identifier] = v;
      }

      // Only pass SCORE in outcomes, deliberately omitting FEEDBACK.
      // The caller is responsible for passing all outcomes it wants tracked.
      const outcomes = { SCORE: 0 };

      const rpNode = doc.querySelector('qti-response-processing');
      const result = processResponses(rpNode, variables, declarations, outcomes);

      expect(result.SCORE).toBe(1);
      // FEEDBACK is not in outcomes, so it should not be in the result —
      // even though a rule sets it during processing.
      expect(result).not.toHaveProperty('FEEDBACK');
    });
  });

  describe('type coercion on outcome assignment', () => {
    it('should coerce float expression result to integer when outcome is declared as integer', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        outcomeDecl('SCORE', 'integer', 'single', defaultValue(0)),
        `<qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1.7</qti-base-value>
        </qti-set-outcome-value>`,
      );
      const result = processResponses(rpNode, variables, declarations, outcomes);
      // float 1.7 should be coerced to integer 1 per the declaration's base type
      expect(result.SCORE).toBe(1);
    });

    it('should coerce string boolean to actual boolean when outcome is declared as boolean', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        [
          responseDecl('RESPONSE', 'identifier', 'single', correctResponse('A')),
          outcomeDecl('PASSED', 'boolean', 'single', defaultValue('false')),
        ],
        `<qti-set-outcome-value identifier="PASSED">
          <qti-match>
            <qti-variable identifier="RESPONSE" />
            <qti-correct identifier="RESPONSE" />
          </qti-match>
        </qti-set-outcome-value>`,
      );
      variables.RESPONSE = 'A';
      const result = processResponses(rpNode, variables, declarations, outcomes);
      // match returns a boolean; boolean declared outcome should stay boolean
      expect(result.PASSED).toBe(true);
      expect(typeof result.PASSED).toBe('boolean');
    });

    it('should wrap a scalar expression result into an array for multiple cardinality outcome', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        outcomeDecl('TAGS', 'identifier', 'multiple'),
        `<qti-set-outcome-value identifier="TAGS">
          <qti-base-value base-type="identifier">solo-tag</qti-base-value>
        </qti-set-outcome-value>`,
      );
      const result = processResponses(rpNode, variables, declarations, outcomes);
      // A single base-value expression produces a scalar, but the outcome is
      // multiple cardinality — coercion should wrap it into a single-element array
      expect(result.TAGS).toEqual(['solo-tag']);
    });

    it('should wrap a scalar expression result into an array for ordered cardinality outcome', () => {
      const { declarations, variables, outcomes, rpNode } = assessmentItem(
        outcomeDecl('SEQUENCE', 'string', 'ordered'),
        `<qti-set-outcome-value identifier="SEQUENCE">
          <qti-base-value base-type="string">only-item</qti-base-value>
        </qti-set-outcome-value>`,
      );
      const result = processResponses(rpNode, variables, declarations, outcomes);
      expect(result.SEQUENCE).toEqual(['only-item']);
    });
  });
});

describe('outcome extraction', () => {
  it('should only return keys from the outcomes parameter, not response variable keys', () => {
    const { declarations, variables, outcomes, rpNode } = assessmentItem(
      [
        responseDecl('RESPONSE', 'identifier'),
        outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
      ],
      `<qti-set-outcome-value identifier="SCORE">
        <qti-base-value base-type="float">1.0</qti-base-value>
      </qti-set-outcome-value>`,
    );
    variables.RESPONSE = 'A';
    const result = processResponses(rpNode, variables, declarations, outcomes);
    // Result should contain SCORE but not RESPONSE
    expect(result).toHaveProperty('SCORE');
    expect(result).not.toHaveProperty('RESPONSE');
    expect(Object.keys(result)).toEqual(['SCORE']);
  });
});

describe('ExitResponseException', () => {
  it('should be throwable and catchable', () => {
    const error = new ExitResponseException();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ExitResponseException');
  });
});

describe('cardinality mismatch in set-outcome-value', () => {
  it('should log a warning when expression result has wrong cardinality for outcome', () => {
    // qti-multiple returns a container (array), but SCORE is single cardinality.
    // The coercion error should be logged and the outcome left at its default.
    const { declarations, variables, outcomes, rpNode } = assessmentItem(
      [
        responseDecl('A', 'identifier'),
        responseDecl('B', 'identifier'),
        outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
      ],
      `<qti-set-outcome-value identifier="SCORE">
        <qti-multiple>
          <qti-variable identifier="A" />
          <qti-variable identifier="B" />
        </qti-multiple>
      </qti-set-outcome-value>`,
    );
    variables.A = 'X';
    variables.B = 'Y';
    mockWarn.mockClear();
    const result = processResponses(rpNode, variables, declarations, outcomes);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('SCORE'));
    expect(result.SCORE).toBe(0); // remains at default
  });

  it('should not treat extra declarations (e.g. context) as outcomes', () => {
    // When declarations contains variables beyond responses and outcomes
    // (e.g. context declarations passed via allDeclarations), they should
    // not appear in the returned outcomes object.
    const { declarations, variables, outcomes, rpNode } = assessmentItem(
      [
        responseDecl('RESPONSE', 'identifier', 'single', correctResponse('A')),
        outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
      ],
      `<qti-response-condition>
        <qti-response-if>
          <qti-match>
            <qti-variable identifier="RESPONSE" />
            <qti-correct identifier="RESPONSE" />
          </qti-match>
          <qti-set-outcome-value identifier="SCORE">
            <qti-base-value base-type="float">1</qti-base-value>
          </qti-set-outcome-value>
        </qti-response-if>
      </qti-response-condition>`,
    );

    // Simulate a context declaration present in declarations but NOT in
    // variables (e.g. context value resolution failed or was omitted).
    const contextDecl = new QTIVariable(
      parseXML(
        '<qti-context-declaration identifier="CONTEXT_VAR" base-type="string" cardinality="single"><qti-default-value><qti-value>ctx</qti-value></qti-default-value></qti-context-declaration>',
      ).documentElement,
    );
    declarations['CONTEXT_VAR'] = contextDecl;

    variables.RESPONSE = 'A';
    const result = processResponses(rpNode, variables, declarations, outcomes);

    // SCORE should be computed correctly
    expect(result.SCORE).toBe(1);
    // CONTEXT_VAR must NOT appear in the returned outcomes
    expect(result).not.toHaveProperty('CONTEXT_VAR');
  });
});

describe('unknown response-processing rules', () => {
  // Authoring errors (e.g. a template-processing rule appearing in a
  // response-processing body) must be surfaced, not silently swallowed.
  it('should warn when an unknown rule tag is encountered', () => {
    mockWarn.mockClear();
    const { declarations, variables, outcomes, rpNode } = assessmentItem(
      outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
      `<qti-set-template-value identifier="SCORE">
        <qti-base-value base-type="float">1</qti-base-value>
      </qti-set-template-value>`,
    );

    processResponses(rpNode, variables, declarations, outcomes);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('qti-set-template-value'));
  });
});
