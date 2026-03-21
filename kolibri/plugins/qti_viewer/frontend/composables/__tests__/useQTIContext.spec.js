/**
 * Integration tests for useQTIContext composable
 * Tests the complete reactive QTI context system
 */

import { defineComponent, nextTick, reactive, ref } from 'vue';
import { render } from '@testing-library/vue';
import { useQTIContext, getQTIDeclarations } from '../useQTIContext.js';
import { parseXML } from '../../utils/xml.js';
import { evaluateNode } from '../../utils/qti/evaluator.js';
import itemsMap from '../../components/__fixtures__/items.js';
import {
  responseDecl,
  outcomeDecl,
  contextDecl,
  defaultValue,
  correctResponse,
  itemXml,
} from '../../utils/qti/__tests__/qtiXmlHelpers';

// Real QTI 3.0 sample items with built-in response-processing templates.
const FIXTURE_MATCH_CORRECT_XML =
  itemsMap['i9b-response-processing-fixed-template-match-correct-identifier'].xml;
const FIXTURE_MAP_RESPONSE_XML =
  itemsMap['i9b-response-processing-fixed-template-map-response-identifier'].xml;

// Mock xml.js so tests don't pull in the real ZipFile / urls dependencies.
// The jsdom test env already provides a working DOMParser, accessed via
// globalThis because Jest's factory-scoping rule only allowlists a small set
// of bare identifiers.
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

const mockWarn = jest.fn();
jest.mock('kolibri-logging', () => ({
  getLogger: () => ({
    warn: (...args) => mockWarn(...args),
  }),
}));

// Item with inline match_correct-style response processing (scores 10 when correct).
const MATCH_CORRECT_ITEM_XML = itemXml(
  [
    responseDecl('RESPONSE', 'identifier', 'single', correctResponse('A')),
    outcomeDecl('SCORE', 'integer', 'single', defaultValue(0)),
  ],
  `<qti-response-processing>
    <qti-response-condition>
      <qti-response-if>
        <qti-match>
          <qti-variable identifier="RESPONSE" />
          <qti-correct identifier="RESPONSE" />
        </qti-match>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="integer">10</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-if>
    </qti-response-condition>
  </qti-response-processing>`,
);

async function setupDeclarations(xmlString, options) {
  const xmlDoc = xmlString ? parseXML(xmlString) : null;
  const ctx = useQTIContext(reactive({ xmlDoc }), options);
  await ctx.ready;
  return ctx;
}

// Build a minimal item that delegates response processing to `templateUri`
// and uses `correctValue` as the correct RESPONSE. SCORE defaults to 0.
function templatedItemXml(templateUri, correctValue = 'A') {
  return itemXml(
    [
      responseDecl('RESPONSE', 'identifier', 'single', correctResponse(correctValue)),
      outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
    ],
    `<qti-response-processing template="${templateUri}" />`,
  );
}

// Build a qti-response-processing template that unconditionally awards `score`
// (float) to SCORE. Returns the documentElement node.
function scoreTemplateNode(score) {
  return parseXML(`<qti-response-processing>
    <qti-set-outcome-value identifier="SCORE">
      <qti-base-value base-type="float">${score}</qti-base-value>
    </qti-set-outcome-value>
  </qti-response-processing>`).documentElement;
}

// Mount a component that calls useQTIContext with the given xmlDoc (ref or
// reactive value) and qtiPackage injection. Returns the ctx.
function mountWithQtiPackage(xmlDocSource, qtiPackage) {
  let ctx;
  const Wrapper = defineComponent({
    setup() {
      ctx = useQTIContext(reactive({ xmlDoc: xmlDocSource }));
      return {};
    },
    template: '<div />',
  });
  render(Wrapper, { provide: { qtiPackage } });
  return ctx;
}

// The purl.imsglobal.org match_correct template URI is resolved by the built-in
// registry (no qtiPackage round-trip) and awards SCORE=1 on correct answer.
const MATCH_CORRECT_TEMPLATE_URI =
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml';

describe('useQTIContext', () => {
  it('should create reactive context without declarations', async () => {
    const { responses, outcomes } = await setupDeclarations();

    expect(Object.keys(responses.value)).toHaveLength(0);
    expect(Object.keys(outcomes.value)).toHaveLength(0);
    expect(responses.value).toEqual({});
  });

  it('should handle type checking during expression parsing', async () => {
    mockWarn.mockClear();
    const declarationsXml = itemXml([
      responseDecl('NUM_VAR', 'integer'),
      responseDecl('STR_VAR', 'string'),
    ]);

    const { createExpression } = await setupDeclarations(declarationsXml);

    // Validation runs inside the computed and returns null on type mismatch.
    const result = createExpression(`
      <qti-equal>
        <qti-variable identifier="NUM_VAR" />
        <qti-variable identifier="STR_VAR" />
      </qti-equal>
    `);
    expect(result.value).toBe(null);
    expect(mockWarn).toHaveBeenCalledWith(
      'QTI expression validation failed:',
      expect.stringContaining('Type mismatch'),
    );
  });

  describe('End-to-end scoring on real QTI 3.0 fixture items', () => {
    // These tests exercise the full composable pipeline (async template
    // resolution, processResponses, outcome reset between runs, reset(),
    // onValueChange) against the canonical QTI 3.0 sample items.

    it('scores, resets, and notifies with the match_correct fixture item', async () => {
      const onValueChange = jest.fn();
      const ctx = useQTIContext(reactive({ xmlDoc: parseXML(FIXTURE_MATCH_CORRECT_XML) }), {
        onValueChange,
      });
      await ctx.ready;

      // SCORE has no default-value in the fixture — starts null.
      expect(ctx.outcomes.value.SCORE.value).toBe(null);

      // onValueChange fires when a response value is set.
      onValueChange.mockClear();
      ctx.responses.value.RESPONSE.value = 'choice_a';
      expect(onValueChange).toHaveBeenCalled();

      // onValueChange must NOT fire when response processing writes outcomes —
      // otherwise any caller that re-runs processing in response to the signal
      // (e.g. the QTI sandbox) loops.
      onValueChange.mockClear();
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(1);
      expect(onValueChange).not.toHaveBeenCalled();

      // Incorrect answer: non-adaptive reset returns SCORE to default (null),
      // then the template's else-branch sets SCORE=0.
      ctx.responses.value.RESPONSE.value = 'choice_b';
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(0);

      // reset() restores declared defaults.
      ctx.reset();
      expect(ctx.responses.value.RESPONSE.value).toBe(null);
      expect(ctx.outcomes.value.SCORE.value).toBe(null);
    });

    it('applies mapping and bounds with the map_response fixture item', async () => {
      const ctx = useQTIContext(reactive({ xmlDoc: parseXML(FIXTURE_MAP_RESPONSE_XML) }));
      await ctx.ready;

      // choice_a (1) + choice_b (2) = 3, within bounds [0, 6].
      ctx.responses.value.RESPONSE.value = ['choice_a', 'choice_b'];
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(3);

      // choice_c = 5, within bounds.
      ctx.responses.value.RESPONSE.value = ['choice_c'];
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(5);

      // choice_d = -1, clamped to lower-bound = 0.
      ctx.responses.value.RESPONSE.value = ['choice_d'];
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(0);

      // 1 + 2 + 5 + -1 = 7, clamped to upper-bound = 6.
      ctx.responses.value.RESPONSE.value = ['choice_a', 'choice_b', 'choice_c', 'choice_d'];
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(6);
    });
  });

  describe('Context Scoping & Inheritance', () => {
    // Consolidated scope/inheritance coverage: hierarchical flow, override precedence,
    // sibling isolation, and unknown-identifier handling.

    function hierarchicalContexts(globalXml, testXml, itemXmlStr) {
      const globalContext = useQTIContext(
        reactive({ xmlDoc: globalXml ? parseXML(globalXml) : null }),
      );
      const testContext = useQTIContext(reactive({ xmlDoc: testXml ? parseXML(testXml) : null }), {
        parentContext: globalContext,
      });
      const itemContext = useQTIContext(
        reactive({ xmlDoc: itemXmlStr ? parseXML(itemXmlStr) : null }),
        {
          parentContext: testContext,
        },
      );
      return { globalContext, testContext, itemContext };
    }

    it('flows parent context down to children and restricts child-only variables', async () => {
      const globalXml = `<qti-assessment-test>${outcomeDecl(
        'GLOBAL_VAR',
        'string',
        'single',
        defaultValue('global'),
      )}</qti-assessment-test>`;
      const testXml = `<qti-assessment-test>${outcomeDecl(
        'TEST_VAR',
        'string',
        'single',
        defaultValue('test'),
      )}</qti-assessment-test>`;
      const itemXmlStr = itemXml(responseDecl('ITEM_RESPONSE', 'identifier'));

      const { globalContext, testContext, itemContext } = hierarchicalContexts(
        globalXml,
        testXml,
        itemXmlStr,
      );

      // Each level sees its own and ancestor variables, but not descendant ones.
      expect(globalContext.outcomes.value.GLOBAL_VAR.value).toBe('global');
      expect(globalContext.outcomes.value.TEST_VAR).toBeUndefined();

      expect(testContext.outcomes.value.GLOBAL_VAR.value).toBe('global');
      expect(testContext.outcomes.value.TEST_VAR.value).toBe('test');
      expect(testContext.responses.value.ITEM_RESPONSE).toBeUndefined();

      expect(itemContext.outcomes.value.GLOBAL_VAR.value).toBe('global');
      expect(itemContext.outcomes.value.TEST_VAR.value).toBe('test');
      expect(itemContext.responses.value.ITEM_RESPONSE).toBeDefined();

      // Mutating the root propagates to descendants.
      globalContext.outcomes.value.GLOBAL_VAR.value = 'global-updated';
      await nextTick();
      expect(testContext.outcomes.value.GLOBAL_VAR.value).toBe('global-updated');
      expect(itemContext.outcomes.value.GLOBAL_VAR.value).toBe('global-updated');
    });

    it('overrides parent variable when child redeclares the same identifier', () => {
      const testXml = `<qti-assessment-test>${outcomeDecl(
        'OVERRIDE_VAR',
        'string',
        'single',
        defaultValue('test-level'),
      )}</qti-assessment-test>`;
      const itemXmlStr = itemXml(
        outcomeDecl('OVERRIDE_VAR', 'string', 'single', defaultValue('item-level')),
      );

      const { testContext, itemContext } = hierarchicalContexts(null, testXml, itemXmlStr);

      expect(testContext.outcomes.value.OVERRIDE_VAR.value).toBe('test-level');
      expect(itemContext.outcomes.value.OVERRIDE_VAR.value).toBe('item-level');
    });

    it('isolates state between sibling contexts sharing a parent', () => {
      const parentXml = `<qti-assessment-test>${outcomeDecl(
        'SHARED',
        'string',
        'single',
        defaultValue('shared'),
      )}</qti-assessment-test>`;
      const sibling1Xml = itemXml(responseDecl('SIBLING1_RESPONSE', 'identifier'));
      const sibling2Xml = itemXml(responseDecl('SIBLING2_RESPONSE', 'identifier'));

      const parentContext = useQTIContext(reactive({ xmlDoc: parseXML(parentXml) }));
      const sibling1 = useQTIContext(reactive({ xmlDoc: parseXML(sibling1Xml) }), {
        parentContext,
      });
      const sibling2 = useQTIContext(reactive({ xmlDoc: parseXML(sibling2Xml) }), {
        parentContext,
      });

      expect(sibling1.outcomes.value.SHARED.value).toBe('shared');
      expect(sibling2.outcomes.value.SHARED.value).toBe('shared');

      expect(sibling1.responses.value.SIBLING1_RESPONSE).toBeDefined();
      expect(sibling1.responses.value.SIBLING2_RESPONSE).toBeUndefined();
      expect(sibling2.responses.value.SIBLING2_RESPONSE).toBeDefined();
      expect(sibling2.responses.value.SIBLING1_RESPONSE).toBeUndefined();
    });

    it('returns undefined when accessing a variable that no context in the chain declares', () => {
      const parentXml = `<qti-assessment-test>${outcomeDecl(
        'KNOWN',
        'string',
        'single',
        defaultValue('known'),
      )}</qti-assessment-test>`;
      const childXml = itemXml(responseDecl('RESPONSE', 'identifier'));

      const parentContext = useQTIContext(reactive({ xmlDoc: parseXML(parentXml) }));
      const childContext = useQTIContext(reactive({ xmlDoc: parseXML(childXml) }), {
        parentContext,
      });

      expect(childContext.outcomes.value.UNKNOWN_IDENTIFIER).toBeUndefined();
      expect(childContext.responses.value.UNKNOWN_IDENTIFIER).toBeUndefined();
      expect(childContext.outcomes.value.KNOWN.value).toBe('known');
    });

    it('evaluates child expressions that reference parent response values', () => {
      const parentXml = itemXml(responseDecl('PARENT_RESP', 'integer'));
      const childXml = itemXml(responseDecl('CHILD_RESP', 'integer'));

      const parentContext = useQTIContext(reactive({ xmlDoc: parseXML(parentXml) }));
      const childContext = useQTIContext(reactive({ xmlDoc: parseXML(childXml) }), {
        parentContext,
      });

      parentContext.responses.value.PARENT_RESP.value = 7;

      const expr = childContext.createExpression(`
        <qti-sum>
          <qti-variable identifier="PARENT_RESP" />
          <qti-variable identifier="CHILD_RESP" />
        </qti-sum>
      `);

      // CHILD_RESP is null → sum returns null (null propagation).
      expect(expr.value).toBe(null);

      childContext.responses.value.CHILD_RESP.value = 3;
      expect(expr.value).toBe(10);
    });
  });

  describe('XML Reactivity', () => {
    it('should rebuild context when XML source changes', async () => {
      const initialXml = itemXml([
        responseDecl('INITIAL_RESPONSE', 'identifier'),
        outcomeDecl('INITIAL_OUTCOME', 'integer', 'single', defaultValue(10)),
      ]);
      const updatedXml = itemXml([
        responseDecl('UPDATED_RESPONSE', 'string'),
        outcomeDecl('UPDATED_OUTCOME', 'integer', 'single', defaultValue(20)),
      ]);

      const xmlDoc = ref(parseXML(initialXml));
      const context = useQTIContext(reactive({ xmlDoc }));

      expect(context.responses.value.INITIAL_RESPONSE).toBeDefined();
      expect(context.outcomes.value.INITIAL_OUTCOME.value).toBe(10);
      expect(context.responses.value.UPDATED_RESPONSE).toBeUndefined();

      xmlDoc.value = parseXML(updatedXml);
      await nextTick();

      expect(context.responses.value.INITIAL_RESPONSE).toBeUndefined();
      expect(context.outcomes.value.INITIAL_OUTCOME).toBeUndefined();
      expect(context.responses.value.UPDATED_RESPONSE).toBeDefined();
      expect(context.outcomes.value.UPDATED_OUTCOME.value).toBe(20);
    });

    it('should reset variable values to new defaults when XML replaces declarations', async () => {
      const baseXml = itemXml(
        responseDecl('PERSISTENT_VAR', 'string', 'single', defaultValue('default')),
      );
      const modifiedXml = itemXml(
        responseDecl('PERSISTENT_VAR', 'string', 'single', defaultValue('new-default')),
      );

      const xmlDoc = ref(parseXML(baseXml));
      const context = useQTIContext(reactive({ xmlDoc }));

      context.responses.value.PERSISTENT_VAR.value = 'custom-value';
      expect(context.responses.value.PERSISTENT_VAR.value).toBe('custom-value');

      xmlDoc.value = parseXML(modifiedXml);
      await nextTick();

      // Should reset to new default, not persist the user-set value.
      expect(context.responses.value.PERSISTENT_VAR.value).toBe('new-default');
    });

    it('should keep createExpression reactive across XML swaps', async () => {
      const createXml = threshold =>
        itemXml([
          responseDecl('USER_SCORE', 'integer', 'single', defaultValue(50)),
          outcomeDecl('PASS_THRESHOLD', 'integer', 'single', defaultValue(threshold)),
        ]);

      const xmlDoc = ref(parseXML(createXml(60)));
      const context = useQTIContext(reactive({ xmlDoc }));

      const isPassing = context.createExpression(`
        <qti-gte>
          <qti-variable identifier="USER_SCORE" />
          <qti-variable identifier="PASS_THRESHOLD" />
        </qti-gte>
      `);

      expect(isPassing.value).toBe(false); // 50 < 60

      xmlDoc.value = parseXML(createXml(40));
      await nextTick();
      expect(isPassing.value).toBe(true); // 50 >= 40
    });
  });

  describe('Full Bidirectional Flow Integration', () => {
    // Smoke test confirming the composable wires a parent → child hierarchy
    // such that child response processing feeds an aggregator using the parent's
    // testStore. Extensive filter/aggregator cases live in evaluator.spec.js
    // and responseProcessing.spec.js.
    it('propagates item outcomes up to a test-level testStore for aggregation', async () => {
      const testStore = { items: {} };
      const registerItemOutcomes = (itemId, outcomes, metadata) => {
        testStore.items[itemId] = {
          outcomes: { ...outcomes },
          baseTypes: metadata.baseTypes || {},
          cardinalities: metadata.cardinalities || {},
          section: metadata.section || null,
          category: metadata.category || null,
        };
      };

      const testXml = `<qti-assessment-test>${outcomeDecl(
        'TOTAL_SCORE',
        'float',
        'single',
        defaultValue(0),
      )}</qti-assessment-test>`;

      const testContext = useQTIContext(reactive({ xmlDoc: parseXML(testXml) }), {
        externalContext: { registerItemOutcomes, testStore },
      });
      const itemContext = useQTIContext(reactive({ xmlDoc: parseXML(MATCH_CORRECT_ITEM_XML) }), {
        parentContext: testContext,
      });
      await itemContext.ready;

      // Correct answer → item SCORE becomes 10.
      itemContext.responses.value.RESPONSE.value = 'A';
      itemContext.processResponses();
      expect(itemContext.outcomes.value.SCORE.value).toBe(10);

      registerItemOutcomes(
        'ITEM1',
        { SCORE: itemContext.outcomes.value.SCORE.value },
        { baseTypes: { SCORE: 'integer' }, cardinalities: { SCORE: 'single' } },
      );

      // Aggregate via qti-test-variables against the testStore.
      const sumExpr = parseXML(
        `<qti-sum><qti-test-variables variable-identifier="SCORE" /></qti-sum>`,
      );
      expect(evaluateNode(sumExpr.documentElement, {}, {}, testStore)).toBe(10);
    });
  });

  describe('Custom response processing templates via qtiPackage', () => {
    it('should resolve and process a custom template URI from a qtiPackage', async () => {
      // Custom template: +5 for correct answer, -1 otherwise.
      const customNode = parseXML(`<qti-response-processing>
        <qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="RESPONSE" />
              <qti-correct identifier="RESPONSE" />
            </qti-match>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">5</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
          <qti-response-else>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">-1</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-else>
        </qti-response-condition>
      </qti-response-processing>`).documentElement;

      const qtiPackage = {
        async getResponseProcessingNode(uri) {
          return uri === 'http://example.com/custom_rp_template' ? customNode : null;
        },
      };

      // useQTIContext injects qtiPackage, so a real component (provide/inject)
      // is required to exercise the injection path.
      const ctx = mountWithQtiPackage(
        parseXML(templatedItemXml('http://example.com/custom_rp_template')),
        qtiPackage,
      );

      await ctx.ready;

      ctx.responses.value.RESPONSE.value = 'A';
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(5);

      ctx.responses.value.RESPONSE.value = 'B';
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(-1);
    });

    it('ready should resolve only after template resolution when xmlDoc ref changes', async () => {
      // First item uses a built-in (synchronous) template; second uses a
      // delayed custom one to prove ready blocks on the new resolution.
      const delayedNode = parseXML(`<qti-response-processing>
        <qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="RESPONSE" />
              <qti-correct identifier="RESPONSE" />
            </qti-match>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">99</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
        </qti-response-condition>
      </qti-response-processing>`).documentElement;

      let resolveTemplate;
      const qtiPackage = {
        getResponseProcessingNode(uri) {
          if (uri === 'http://example.com/delayed_template') {
            return new Promise(resolve => {
              resolveTemplate = () => resolve(delayedNode.cloneNode(true));
            });
          }
          return Promise.resolve(null);
        },
      };

      const xmlDocRef = ref(parseXML(templatedItemXml(MATCH_CORRECT_TEMPLATE_URI)));
      const ctx = mountWithQtiPackage(xmlDocRef, qtiPackage);

      // First item resolves immediately (built-in template) — SCORE=1 on match.
      await ctx.ready;
      ctx.responses.value.RESPONSE.value = 'A';
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(1);

      // Switch to second item with delayed custom template.
      xmlDocRef.value = parseXML(templatedItemXml('http://example.com/delayed_template', 'X'));
      await nextTick();

      let readyResolved = false;
      ctx.ready.then(() => {
        readyResolved = true;
      });

      // ready should still be pending while the template loads.
      await nextTick();
      expect(readyResolved).toBe(false);

      resolveTemplate();
      await ctx.ready;

      ctx.responses.value.RESPONSE.value = 'X';
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(99);
    });

    it('should use the latest template when xmlDoc changes twice before the first resolves', async () => {
      // Two slow async templates; we switch A → B before A resolves and
      // expect B to win even when A's resolve callback fires later.
      let resolveA;
      let resolveB;
      const qtiPackage = {
        getResponseProcessingNode(uri) {
          if (uri === 'http://example.com/slow_template_A') {
            return new Promise(resolve => {
              resolveA = () => resolve(scoreTemplateNode(10).cloneNode(true));
            });
          }
          if (uri === 'http://example.com/slow_template_B') {
            return new Promise(resolve => {
              resolveB = () => resolve(scoreTemplateNode(20).cloneNode(true));
            });
          }
          return Promise.resolve(null);
        },
      };

      const xmlDocRef = ref(parseXML(templatedItemXml(MATCH_CORRECT_TEMPLATE_URI)));
      const ctx = mountWithQtiPackage(xmlDocRef, qtiPackage);
      await ctx.ready;

      xmlDocRef.value = parseXML(templatedItemXml('http://example.com/slow_template_A'));
      await nextTick();
      // Switch to B before A resolves — second in-flight resolution.
      xmlDocRef.value = parseXML(templatedItemXml('http://example.com/slow_template_B', 'B'));
      await nextTick();

      // Resolve B (the current doc) first, then A (the stale doc).
      resolveB();
      await ctx.ready;

      resolveA();
      // Flush all microtasks — the stale .then() chain needs several ticks
      // to propagate through resolveTemplate → resolveResponseProcessingNode.
      await new Promise(resolve => setTimeout(resolve, 0));

      // processResponses should use template B (SCORE=20), not stale A.
      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(20);
    });

    it('ready should not resolve prematurely when stale async resolution finishes before current', async () => {
      // Race condition: when xmlDoc changes A→B and A's template resolves
      // before B's, ready must NOT resolve until B's template is loaded.
      let resolveA;
      let resolveB;
      const qtiPackage = {
        getResponseProcessingNode(uri) {
          if (uri === 'http://example.com/slow_template_A') {
            return new Promise(resolve => {
              resolveA = () => resolve(scoreTemplateNode(10).cloneNode(true));
            });
          }
          if (uri === 'http://example.com/slow_template_B') {
            return new Promise(resolve => {
              resolveB = () => resolve(scoreTemplateNode(20).cloneNode(true));
            });
          }
          return Promise.resolve(null);
        },
      };

      const xmlDocRef = ref(parseXML(templatedItemXml(MATCH_CORRECT_TEMPLATE_URI)));
      const ctx = mountWithQtiPackage(xmlDocRef, qtiPackage);
      await ctx.ready;

      xmlDocRef.value = parseXML(templatedItemXml('http://example.com/slow_template_A'));
      await nextTick();
      xmlDocRef.value = parseXML(templatedItemXml('http://example.com/slow_template_B', 'B'));
      await nextTick();

      // Resolve A (STALE) first — ready must NOT resolve yet.
      resolveA();
      await new Promise(resolve => setTimeout(resolve, 0));

      let readyResolved = false;
      ctx.ready.then(() => {
        readyResolved = true;
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(readyResolved).toBe(false);

      // Resolve B (current doc) — ready should now resolve.
      resolveB();
      await ctx.ready;

      ctx.processResponses();
      expect(ctx.outcomes.value.SCORE.value).toBe(20);
    });

    it('ready should resolve even when async template resolution rejects', async () => {
      const qtiPackage = {
        getResponseProcessingNode: () => Promise.reject(new Error('Network error')),
      };

      const ctx = mountWithQtiPackage(
        parseXML(templatedItemXml('http://example.com/broken_template')),
        qtiPackage,
      );

      // ready should still resolve (not hang forever) even though the template failed.
      await expect(
        Promise.race([
          ctx.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('ready hung')), 1000)),
        ]),
      ).resolves.toBeUndefined();
    });
  });
});

describe('getQTIDeclarations', () => {
  it('should parse context declarations without a valueSetCallback', async () => {
    const xmlDoc = parseXML(
      itemXml([
        contextDecl('CANDIDATE_ID', 'string', 'single', defaultValue('student-1')),
        contextDecl('TIME_LIMIT', 'integer', 'single', defaultValue(60)),
      ]),
    );

    const declarations = getQTIDeclarations(xmlDoc, 'context');

    expect(Object.keys(declarations)).toEqual(['CANDIDATE_ID', 'TIME_LIMIT']);
    expect(declarations.CANDIDATE_ID.value).toBe('student-1');
    expect(declarations.TIME_LIMIT.value).toBe(60);
  });
});

describe('createExpression validation caching', () => {
  beforeEach(() => mockWarn.mockClear());

  it('should not re-validate when only variable values change (not declarations)', async () => {
    const ctx = useQTIContext(
      reactive({
        xmlDoc: parseXML(
          itemXml([
            responseDecl('RESPONSE', 'identifier', 'single', correctResponse('A')),
            outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
          ]),
        ),
      }),
    );

    // Reference an undeclared variable to trigger a validation warning.
    const expr = ctx.createExpression(`
      <qti-match>
        <qti-variable identifier="RESPONSE" />
        <qti-variable identifier="MISSING_VAR" />
      </qti-match>
    `);

    mockWarn.mockClear();
    expr.value;
    expect(mockWarn.mock.calls.length).toBeGreaterThan(0);

    // Value change (not declaration change) shouldn't re-validate.
    ctx.responses.value.RESPONSE.value = 'A';

    mockWarn.mockClear();
    expr.value;
    expect(mockWarn).not.toHaveBeenCalled();
  });

  describe('Cached response processing node', () => {
    it('should resolve synchronously when template was pre-cached by a prior async call', async () => {
      const xmlDoc = parseXML(
        itemXml(
          [
            responseDecl('RESPONSE', 'identifier', 'single', correctResponse('A')),
            outcomeDecl('SCORE', 'float', 'single', defaultValue(0)),
          ],
          `<qti-response-processing
            template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml"
          />`,
        ),
      );

      // First call resolves async and caches (simulating QTIViewer pre-fetch).
      const preCtx = useQTIContext(reactive({ xmlDoc }));
      await preCtx.ready;

      // Second call should resolve synchronously from cache — no await needed.
      const ctx = useQTIContext(reactive({ xmlDoc }));

      ctx.responses.value.RESPONSE.value = 'A';
      ctx.processResponses();

      expect(ctx.outcomes.value.SCORE.value).toBe(1);
    });
  });
});
