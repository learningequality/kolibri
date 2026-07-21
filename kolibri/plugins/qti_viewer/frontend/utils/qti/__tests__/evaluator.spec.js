/**
 * Unit tests for QTI expression evaluator
 * Tests the pure evaluation functions for QTI expressions
 *
 * Test pattern: use parseAssessmentExpression() with full QTI XML
 * (qti-assessment-item containing declarations and a qti-set-outcome-value
 * wrapper around the expression under test). This exercises the real
 * declaration parsing pipeline rather than hand-constructing JS objects.
 */

// Mock xml.js with a real DOMParser implementation
import { parseXML } from '../../xml';
import { evaluateNode, validateExpressionNode } from '../evaluator.js';
import { QTIVariable } from '../variables';
import {
  responseDecl,
  outcomeDecl,
  correctResponse,
  itemXml,
  baseValue,
  variable,
  op,
} from './qtiXmlHelpers';

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
 * Parse a full QTI assessment item XML and return declarations, variables,
 * and the expression node — ready for evaluateNode.
 * @param {string} xmlString - Full QTI assessment item XML
 * @returns {{declarations: object, variables: object, exprNode: Element}}
 */
function parseAssessmentExpression(xmlString) {
  const doc = parseXML(xmlString);
  const declarations = {};
  const variables = {};

  for (const node of doc.querySelectorAll('qti-response-declaration')) {
    const v = new QTIVariable(node);
    declarations[v.identifier] = v;
    variables[v.identifier] = v.value;
  }

  const exprNode = doc.querySelector('qti-set-outcome-value > *');
  return { declarations, variables, exprNode };
}

// Wrap declarations around a set-outcome-value expression and parse the result.
function assessmentExpr(declarations, expression) {
  return parseAssessmentExpression(
    itemXml(
      declarations,
      `<qti-set-outcome-value identifier="SCORE">${expression}</qti-set-outcome-value>`,
    ),
  );
}

function parseQTIExpression(xmlString, variables, declarations = {}) {
  const doc = parseXML(xmlString);

  // Merge variables into declarations for validation (variables keys need to exist for validation)
  // If declarations already has the variable, use that; otherwise create a minimal declaration
  const mergedDeclarations = { ...declarations };
  for (const key of Object.keys(variables)) {
    if (!mergedDeclarations[key]) {
      mergedDeclarations[key] = { value: variables[key] };
    }
  }

  // Type check the expression tree
  validateExpressionNode(doc.documentElement, mergedDeclarations);

  // Return pure evaluation function
  return () => evaluateNode(doc.documentElement, variables, declarations);
}

describe('parseQTIExpression', () => {
  it('should parse simple variable expression', () => {
    const variables = { SCORE: 42 };
    const evaluator = parseQTIExpression('<qti-variable identifier="SCORE" />', variables);

    const result = evaluator();
    expect(result).toBe(42);
  });

  it('should parse base value expressions', () => {
    const intEvaluator = parseQTIExpression(
      '<qti-base-value base-type="integer">42</qti-base-value>',
      {},
    );
    expect(intEvaluator()).toBe(42);

    const floatEvaluator = parseQTIExpression(
      '<qti-base-value base-type="float">3.14</qti-base-value>',
      {},
    );
    expect(floatEvaluator()).toBe(3.14);

    const boolEvaluator = parseQTIExpression(
      '<qti-base-value base-type="boolean">true</qti-base-value>',
      {},
    );
    expect(boolEvaluator()).toBe(true);

    const stringEvaluator = parseQTIExpression(
      '<qti-base-value base-type="string">hello</qti-base-value>',
      {},
    );
    expect(stringEvaluator()).toBe('hello');
  });

  it('should throw error for invalid XML', () => {
    expect(() => {
      parseQTIExpression('<invalid-xml><unclosed');
    }).toThrow('XML parsing error');
  });
});

describe('mathematical operations', () => {
  it('should evaluate sum expressions', () => {
    const evaluator = parseQTIExpression(
      op('sum', baseValue('integer', 10), baseValue('integer', 20), baseValue('integer', 30)),
      {},
    );

    expect(evaluator()).toBe(60);
  });

  it('should evaluate sum with variables', () => {
    const evaluator = parseQTIExpression(
      op('sum', variable('A'), variable('B'), baseValue('integer', 5)),
      { A: 10, B: 20 },
    );

    expect(evaluator()).toBe(35);
  });

  it('should throw error when variable is missing', () => {
    expect(() => {
      parseQTIExpression(op('sum', variable('MISSING'), baseValue('integer', 10)), {});
    }).toThrow(TypeError);
  });

  it('should flatten and sum array containers (multiple cardinality)', () => {
    const variables = { SCORES: [10, 20, 30] };
    const evaluator = parseQTIExpression(op('sum', variable('SCORES')), variables);
    // Array [10, 20, 30] should be flattened and summed
    expect(evaluator()).toBe(60);
  });

  it('should flatten mixed arrays and scalars in sum', () => {
    const variables = { SCORES: [10, 20], BONUS: 5 };
    const evaluator = parseQTIExpression(
      op('sum', variable('SCORES'), variable('BONUS')),
      variables,
    );
    // [10, 20] + 5 should flatten to 10 + 20 + 5 = 35
    expect(evaluator()).toBe(35);
  });

  it('should return null when sum operand flattens to empty container', () => {
    // Empty containers are treated as NULL per qti-is-null
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpIsNull
    // When qti-sum flattens a container sub-expression that evaluates to
    // [], the NULL input should propagate rather than reduce to the
    // initial value of 0
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpSum
    const variables = { SCORES: [] };
    const evaluator = parseQTIExpression(op('sum', variable('SCORES')), variables);
    expect(evaluator()).toBe(null);
  });

  it('should evaluate product expressions', () => {
    const evaluator = parseQTIExpression(
      op('product', baseValue('integer', 2), baseValue('integer', 3), baseValue('integer', 4)),
      {},
    );

    expect(evaluator()).toBe(24);
  });

  it('should return null when product operand flattens to empty container', () => {
    const variables = { SCORES: [] };
    const evaluator = parseQTIExpression(op('product', variable('SCORES')), variables);
    expect(evaluator()).toBe(null);
  });

  it('should evaluate divide expressions', () => {
    const evaluator = parseQTIExpression(
      op('divide', baseValue('integer', 20), baseValue('integer', 4)),
      {},
    );

    expect(evaluator()).toBe(5);
  });

  // qti-divide with zero second operand returns NULL — v3 section 2.11.3.19
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpDivide
  it('should return null for division by zero', () => {
    const evaluator = parseQTIExpression(
      op('divide', baseValue('integer', 10), baseValue('integer', 0)),
      {},
    );

    expect(evaluator()).toBe(null);
  });

  it('should evaluate subtract expressions', () => {
    const evaluator = parseQTIExpression(
      op('subtract', baseValue('integer', 10), baseValue('integer', 3)),
      {},
    );
    expect(evaluator()).toBe(7);
  });

  // qti-power: [label, base, baseType, exp, expType, expected]
  // Domain errors (Infinity / NaN) return null per QTI convention.
  it.each([
    ['normal integer power', 2, 'integer', 3, 'integer', 8],
    ['0^0 returns 1 (Math.pow convention)', 0, 'integer', 0, 'integer', 1],
    ['negative exponent', 2, 'integer', -2, 'integer', 0.25],
    ['0^-1 → Infinity → null', 0, 'integer', -1, 'integer', null],
    ['negative base with fractional exp → NaN → null', -1, 'integer', 0.5, 'float', null],
  ])('qti-power: %s', (_label, base, baseType, exp, expType, expected) => {
    const evaluator = parseQTIExpression(
      `<qti-power><qti-base-value base-type="${baseType}">${base}</qti-base-value><qti-base-value base-type="${expType}">${exp}</qti-base-value></qti-power>`,
      {},
    );
    expect(evaluator()).toBe(expected);
  });

  // qti-min and qti-max share identical structure — tabulate the happy/null cases together.
  it.each([
    ['min of 5,3,7 is 3', 'qti-min', 3],
    ['max of 5,3,7 is 7', 'qti-max', 7],
  ])('%s', (_label, op, expected) => {
    const evaluator = parseQTIExpression(
      `<${op}><qti-base-value base-type="integer">5</qti-base-value><qti-base-value base-type="integer">3</qti-base-value><qti-base-value base-type="integer">7</qti-base-value></${op}>`,
      {},
    );
    expect(evaluator()).toBe(expected);
  });

  // Null/empty edge cases for qti-min and qti-max. Both return NULL if any
  // sub-expression is NULL — v3 2.11.3.13 / 2.11.3.14
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpMin
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpMax
  // [op, childrenXml, variables]
  it.each([
    [
      'qti-min',
      '<qti-variable identifier="A" /><qti-variable identifier="B" />',
      { A: null, B: null },
    ], // all null
    [
      'qti-max',
      '<qti-variable identifier="A" /><qti-variable identifier="B" />',
      { A: null, B: null },
    ], // all null
    [
      'qti-min',
      '<qti-variable identifier="A" /><qti-variable identifier="B" /><qti-base-value base-type="integer">3</qti-base-value>',
      { A: null, B: 5 },
    ], // any null
    [
      'qti-max',
      '<qti-variable identifier="A" /><qti-variable identifier="B" /><qti-base-value base-type="integer">3</qti-base-value>',
      { A: null, B: 5 },
    ], // any null
    ['qti-min', '', {}], // empty children
    ['qti-max', '', {}], // empty children
  ])('%s returns null for null/empty cases', (op, children, variables) => {
    const evaluator = parseQTIExpression(`<${op}>${children}</${op}>`, variables);
    expect(evaluator()).toBe(null);
  });
});

describe('comparison operations', () => {
  it('should evaluate equal expressions', () => {
    const evaluator = parseQTIExpression(
      op('equal', baseValue('integer', 5), baseValue('integer', 5)),
      {},
    );

    expect(evaluator()).toBe(true);
  });

  it('should evaluate greater-than-or-equal expressions', () => {
    const variables = { SCORE: 75 };
    const evaluator = parseQTIExpression(
      op('gte', variable('SCORE'), baseValue('integer', 60)),
      variables,
    );

    expect(evaluator()).toBe(true);
    variables.SCORE = 60;
    expect(evaluator()).toBe(true);
    variables.SCORE = 45;
    expect(evaluator()).toBe(false);
  });

  it('should evaluate less-than expressions', () => {
    const variables = { ATTEMPTS: 1 };
    const evaluator = parseQTIExpression(
      op('lt', variable('ATTEMPTS'), baseValue('integer', 3)),
      variables,
    );

    expect(evaluator()).toBe(true);
    variables.ATTEMPTS = 3;
    expect(evaluator()).toBe(false);
    variables.ATTEMPTS = 5;
    expect(evaluator()).toBe(false);
  });

  // qti-equal tolerance mode tests.
  // Build qti-equal with optional tolerance-mode/tolerance/include-*-bound attrs.
  function equalExpr(attrs, a, b) {
    const attrStr = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    const openTag = attrStr ? `<qti-equal ${attrStr}>` : '<qti-equal>';
    return `${openTag}<qti-base-value base-type="float">${a}</qti-base-value><qti-base-value base-type="float">${b}</qti-base-value></qti-equal>`;
  }

  // [label, attrs, a, b, expected]
  // Covers: exact (default), absolute tolerance (in/out of range, asymmetric tolerances,
  // include-lower-bound, include-upper-bound), and relative tolerance (in/out of range).
  it.each([
    ['exact mode (default) rejects near-equal', {}, 10.0, 10.0001, false],
    [
      'absolute tolerance 0.5 includes 10.3 for x=10',
      { 'tolerance-mode': 'absolute', tolerance: '0.5' },
      10.0,
      10.3,
      true,
    ],
    [
      'absolute tolerance 0.5 excludes 10.6 for x=10',
      { 'tolerance-mode': 'absolute', tolerance: '0.5' },
      10.0,
      10.6,
      false,
    ],
    [
      'asymmetric absolute tolerance "0.2 0.5" includes 10.4',
      { 'tolerance-mode': 'absolute', tolerance: '0.2 0.5' },
      10.0,
      10.4,
      true,
    ],
    [
      'asymmetric absolute tolerance "0.2 0.5" excludes 9.7',
      { 'tolerance-mode': 'absolute', tolerance: '0.2 0.5' },
      10.0,
      9.7,
      false,
    ],
    [
      'relative tolerance 10% includes 105 for x=100',
      { 'tolerance-mode': 'relative', tolerance: '10' },
      100.0,
      105.0,
      true,
    ],
    [
      'relative tolerance 10% excludes 115 for x=100',
      { 'tolerance-mode': 'relative', tolerance: '10' },
      100.0,
      115.0,
      false,
    ],
    [
      'include-lower-bound=false excludes y at lower bound',
      { 'tolerance-mode': 'absolute', tolerance: '0.5', 'include-lower-bound': 'false' },
      10.0,
      9.5,
      false,
    ],
    [
      'include-upper-bound=false excludes y at upper bound',
      { 'tolerance-mode': 'absolute', tolerance: '0.5', 'include-upper-bound': 'false' },
      10.0,
      10.5,
      false,
    ],
  ])('qti-equal: %s', (_label, attrs, a, b, expected) => {
    expect(parseQTIExpression(equalExpr(attrs, a, b), {})()).toBe(expected);
  });

  it('should return null for equal with tolerance when operand is null', () => {
    const evaluator = parseQTIExpression(
      `<qti-equal tolerance-mode="absolute" tolerance="0.5"><qti-variable identifier="A" /><qti-base-value base-type="float">10.0</qti-base-value></qti-equal>`,
      { A: null },
    );
    expect(evaluator()).toBe(null);
  });

  // The spec's relative-tolerance formula — b in [a*(1-t0/100), a*(1+t1/100)] —
  // produces an inverted (empty) interval when a < 0, so no b is ever in range.
  // We preserve the literal formula for interoperability with other QTI players
  // (amp-up-io, oat-sa, qtiworks all implement it this way) and warn instead,
  // so item authors can spot their broken item.
  it('should warn for relative tolerance with a negative first operand', () => {
    mockWarn.mockClear();
    const evaluator = parseQTIExpression(
      equalExpr({ 'tolerance-mode': 'relative', tolerance: '10' }, -10.0, -10.0),
      {},
    );
    expect(evaluator()).toBe(false);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('relative tolerance'));
  });
});

describe('null propagation across operators', () => {
  // Many binary/n-ary operators share the same null-propagation rule: if
  // any operand is NULL, the operator returns NULL. This is stated
  // per-operator in v3 section 2.11.3 — e.g. #OpSum, #OpProduct, #OpDivide,
  // #OpEqual, #OpLT, #OpMatch, #OpDurationLT etc.
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#Expr3
  // This table consolidates those cases into one place.
  //
  // Row: [operatorTag, [operandA, operandB], variables]
  //   where each operand is either a literal qti-base-value XML or a qti-variable ref
  //   and variables provides any needed variable values (notably nulls).
  const varRef = id => `<qti-variable identifier="${id}" />`;

  describe.each([
    // Arithmetic
    ['qti-sum', [varRef('A'), varRef('B')], { A: 10, B: null }],
    ['qti-product', [varRef('A'), varRef('B')], { A: 10, B: null }],
    ['qti-divide', [varRef('A'), varRef('B')], { A: 10, B: null }],
    ['qti-subtract', [varRef('A'), varRef('B')], { A: null, B: 5 }],
    ['qti-power', [varRef('BASE'), varRef('EXP')], { BASE: null, EXP: null }],
    ['qti-gcd', [varRef('A'), varRef('B')], { A: 12, B: null }],
    ['qti-lcm', [varRef('A'), varRef('B')], { A: null, B: 6 }],
    // Comparison
    ['qti-equal', [varRef('A'), varRef('B')], { A: 5, B: null }],
    ['qti-lt', [varRef('A'), varRef('B')], { A: 5, B: null }],
    ['qti-lte', [varRef('A'), varRef('B')], { A: null, B: 10 }],
    ['qti-gt', [varRef('A'), varRef('B')], { A: null, B: null }],
    ['qti-gte', [varRef('A'), varRef('B')], { A: 5, B: null }],
    // Match
    ['qti-match', [varRef('A'), varRef('B')], { A: null, B: 'test' }],
    // Duration comparison
    ['qti-duration-lt', [varRef('A'), varRef('B')], { A: null, B: 60.0 }],
    ['qti-duration-gte', [varRef('A'), varRef('B')], { A: 60.0, B: null }],
  ])('%s', (op, operands, variables) => {
    it('returns null when any operand is null', () => {
      // Wrap both operands in the operator tag and evaluate.
      const xml = `<${op}>${operands.join('')}</${op}>`;
      expect(parseQTIExpression(xml, variables)()).toBe(null);
    });
  });
});

describe('logical operations', () => {
  it('should evaluate and expressions', () => {
    const evaluator = parseQTIExpression(
      op(
        'and',
        baseValue('boolean', 'true'),
        baseValue('boolean', 'true'),
        baseValue('boolean', 'true'),
      ),
      {},
    );

    expect(evaluator()).toBe(true);
  });

  it('should evaluate or expressions', () => {
    const evaluator = parseQTIExpression(
      op(
        'or',
        baseValue('boolean', 'false'),
        baseValue('boolean', 'true'),
        baseValue('boolean', 'false'),
      ),
      {},
    );

    expect(evaluator()).toBe(true);
  });

  it('should evaluate not expressions', () => {
    const evaluator = parseQTIExpression(op('not', baseValue('boolean', 'false')), {});

    expect(evaluator()).toBe(true);
  });

  // Three-valued logic for qti-and, qti-or, qti-not — v3 2.11.3.10,
  // 2.11.3.15, 2.11.3.35
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpAnd
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpOr
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpNot
  // [op, operands, expected]
  // and(true, null) = null (unknown); and(false, null) = false (short-circuit).
  // or(false, null) = null (unknown); or(true, null) = true (short-circuit).
  // not(null) = null.
  it.each([
    ['qti-and', { A: true, B: null }, null],
    ['qti-and', { A: false, B: null }, false],
    ['qti-or', { A: false, B: null }, null],
    ['qti-or', { A: true, B: null }, true],
  ])('%s with three-valued logic: %p → %p', (op, vars, expected) => {
    const evaluator = parseQTIExpression(
      `<${op}><qti-variable identifier="A" /><qti-variable identifier="B" /></${op}>`,
      vars,
    );
    expect(evaluator()).toBe(expected);
  });

  // qti-not of NULL is NULL — v3 section 2.11.3.35
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpNot
  it('not(null) returns null', () => {
    const evaluator = parseQTIExpression(op('not', variable('A')), { A: null });
    expect(evaluator()).toBe(null);
  });
});

describe('utility operations', () => {
  it('should evaluate is-null expressions', () => {
    const variables = { MISSING: null };
    const evaluator = parseQTIExpression(op('is-null', variable('MISSING')), variables);

    expect(evaluator()).toBe(true);
    variables.MISSING = 'present';
    expect(evaluator()).toBe(false);
  });

  it('should evaluate container-size expressions', () => {
    const variables = { ARRAY: [1, 2, 3] };
    const evaluator = parseQTIExpression(op('container-size', variable('ARRAY')), variables);

    expect(evaluator()).toBe(3);
    variables.ARRAY = [];
    expect(evaluator()).toBe(0);
    variables.ARRAY = 'single';
    expect(evaluator()).toBe(1);
  });

  // qti-container-size: "If the sub-expression is NULL the result is 0" —
  // v3 section 2.11.3.32
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpContainerSize
  it('should return 0 for container-size with null', () => {
    const variables = { X: null };
    const evaluator = parseQTIExpression(op('container-size', variable('X')), variables);
    expect(evaluator()).toBe(0);
  });

  it('should return 1 for container-size of a single compound value (pair)', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESPONSE', 'pair', 'single'),
      op('container-size', variable('RESPONSE')),
    );
    variables.RESPONSE = ['A', 'B'];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(1);
  });

  it('should return 1 for container-size of a single point value', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESPONSE', 'point', 'single'),
      op('container-size', variable('RESPONSE')),
    );
    variables.RESPONSE = [100, 200];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(1);
  });

  it('should return correct count for container-size of a multiple container', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESPONSE', 'identifier', 'multiple'),
      op('container-size', variable('RESPONSE')),
    );
    variables.RESPONSE = ['A', 'B', 'C'];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(3);
  });

  it('should evaluate string-match expressions', () => {
    const caseSensitive = parseQTIExpression(
      op('string-match', baseValue('string', 'Hello'), baseValue('string', 'hello')),
      {},
    );

    const caseInsensitive = parseQTIExpression(
      op(
        'string-match',
        { 'case-sensitive': 'false' },
        baseValue('string', 'Hello'),
        baseValue('string', 'hello'),
      ),
      {},
    );

    expect(caseSensitive()).toBe(false);
    expect(caseInsensitive()).toBe(true);
  });
});

describe('member operator', () => {
  // Scalar/container member tests: value is a literal base-value, container is a variable.
  // [label, baseType, value, containerVarValue, expected]
  it.each([
    ['value in array', 'identifier', 'B', ['A', 'B', 'C'], true],
    ['value not in array', 'identifier', 'D', ['A', 'B', 'C'], false],
    ['matches single (non-array) value', 'identifier', 'A', 'A', true],
    ['does not match single (non-array) value', 'identifier', 'B', 'A', false],
    ['numeric values', 'integer', 3, [1, 2, 3, 4, 5], true],
    ['set is null → null', 'identifier', 'A', null, null],
  ])('should handle %s', (_label, baseType, value, containerValue, expected) => {
    const evaluator = parseQTIExpression(
      `<qti-member><qti-base-value base-type="${baseType}">${value}</qti-base-value><qti-variable identifier="SET" /></qti-member>`,
      { SET: containerValue },
    );
    expect(evaluator()).toBe(expected);
  });

  it('should return null when value is null', () => {
    const evaluator = parseQTIExpression(
      `<qti-member><qti-variable identifier="VAL" /><qti-variable identifier="SET" /></qti-member>`,
      { SET: ['A', 'B', 'C'], VAL: null },
    );
    expect(evaluator()).toBe(null);
  });

  // Point-value member tests (both operands are variables holding arrays).
  it.each([
    [
      'point is member of point container',
      [100, 200],
      [
        [100, 200],
        [300, 400],
      ],
      true,
    ],
    [
      'point is not member of point container',
      [999, 888],
      [
        [100, 200],
        [300, 400],
      ],
      false,
    ],
  ])('%s', (_label, point, points, expected) => {
    const evaluator = parseQTIExpression(
      `<qti-member><qti-variable identifier="POINT" /><qti-variable identifier="POINTS" /></qti-member>`,
      { POINT: point, POINTS: points },
    );
    expect(evaluator()).toBe(expected);
  });
});

describe('contains operator', () => {
  // Container-plus-literal-value cases. [label, baseType, literalValue, containerValue, expected]
  it.each([
    ['array contains identifier', 'identifier', 'B', ['A', 'B', 'C'], true],
    ['array does not contain identifier', 'identifier', 'D', ['A', 'B', 'C'], false],
    ['non-array container is false (not substring)', 'string', 'World', 'Hello World', false],
    ['numeric array contains value', 'integer', 20, [10, 20, 30], true],
    ['null container returns null', 'identifier', 'A', null, null],
  ])('%s', (_label, baseType, value, containerValue, expected) => {
    const evaluator = parseQTIExpression(
      `<qti-contains><qti-variable identifier="CONTAINER" /><qti-base-value base-type="${baseType}">${value}</qti-base-value></qti-contains>`,
      { CONTAINER: containerValue },
    );
    expect(evaluator()).toBe(expected);
  });

  it('should return null when value is null', () => {
    const evaluator = parseQTIExpression(
      `<qti-contains><qti-variable identifier="CONTAINER" /><qti-variable identifier="VAL" /></qti-contains>`,
      { CONTAINER: ['A', 'B', 'C'], VAL: null },
    );
    expect(evaluator()).toBe(null);
  });

  // Pair-in-container cases — both operands are variables holding arrays.
  it.each([
    [
      'pair is member of pair container',
      ['C', 'D'],
      [
        ['A', 'B'],
        ['C', 'D'],
        ['E', 'F'],
      ],
      true,
    ],
    [
      'pair is not member of pair container',
      ['X', 'Y'],
      [
        ['A', 'B'],
        ['C', 'D'],
      ],
      false,
    ],
  ])('%s', (_label, pair, pairs, expected) => {
    const evaluator = parseQTIExpression(
      `<qti-contains><qti-variable identifier="PAIRS" /><qti-variable identifier="PAIR" /></qti-contains>`,
      { PAIRS: pairs, PAIR: pair },
    );
    expect(evaluator()).toBe(expected);
  });
});

describe('substring operator', () => {
  // [label, sub, str, expected]
  // Null on either operand propagates; non-strings are coerced to strings for the check.
  it.each([
    ['substring found', 'Hello', 'Hello World', true],
    ['substring not found', 'Goodbye', 'Hello World', false],
    ['null first operand', null, 'Hello World', null],
    ['null second operand', 'Hello', null, null],
    ['non-string values coerced to strings', 23, 12345, true],
  ])('%s', (_label, sub, str, expected) => {
    const evaluator = parseQTIExpression(
      `<qti-substring><qti-variable identifier="SUB" /><qti-variable identifier="STR" /></qti-substring>`,
      { SUB: sub, STR: str },
    );
    expect(evaluator()).toBe(expected);
  });
});

describe('pattern-match operator', () => {
  // Build a qti-pattern-match XML. Passing pattern=null omits the attribute entirely.
  function patternMatch(pattern, textVar = 'TEXT') {
    const attr = pattern === null ? '' : ` pattern="${pattern}"`;
    return `<qti-pattern-match${attr}><qti-variable identifier="${textVar}" /></qti-pattern-match>`;
  }

  // [label, pattern, text, expected]
  // XSD regex implicit full-string anchoring; ^ and $ are literal characters;
  // missing or invalid patterns return null.
  it.each([
    ['matches digit pattern', 'Hello\\d+', 'Hello123', true],
    ['does not match when pattern fails', 'Hello\\d+', 'HelloWorld', false],
    ['null text returns null', 'null', null, null],
    ['empty pattern matches empty string only', '', '', true],
    ['empty pattern rejects non-empty string', '', 'anything', false],
    ['invalid regex returns null', '[invalid(regex', 'anything', null],
    ['missing pattern attribute returns null', null, 'anything', null],
    ['XSD regex anchored: partial match rejected', '[0-9]{3}', 'abc123def', false],
    ['XSD regex anchored: full match accepted', '[0-9]{3}', '123', true],
    ['^ is a literal char in XSD regex: no match', '^hello', 'hello', false],
    ['^ is a literal char in XSD regex: match', '^hello', '^hello', true],
    ['$ is a literal char in XSD regex: no match', 'world$', 'world', false],
    ['$ is a literal char in XSD regex: match', 'world$', 'world$', true],
  ])('%s', (_label, pattern, text, expected) => {
    expect(parseQTIExpression(patternMatch(pattern), { TEXT: text })()).toBe(expected);
  });
});

describe('null expression', () => {
  it('should evaluate null expression', () => {
    const evaluator = parseQTIExpression('<qti-null />', {});
    expect(evaluator()).toBe(null);
  });
});

describe('default expression', () => {
  it('should evaluate default expression', () => {
    const declarations = {
      RESPONSE: { defaultValue: 'default-answer', baseType: 'string', cardinality: 'single' },
    };
    const evaluator = parseQTIExpression('<qti-default identifier="RESPONSE" />', {}, declarations);
    expect(evaluator()).toBe('default-answer');
  });

  it('should return null when no default defined', () => {
    const declarations = {
      RESPONSE: { defaultValue: null, baseType: 'string', cardinality: 'single' },
    };
    const evaluator = parseQTIExpression('<qti-default identifier="RESPONSE" />', {}, declarations);
    expect(evaluator()).toBe(null);
  });

  it('should return null when identifier not declared', () => {
    const evaluator = parseQTIExpression('<qti-default identifier="UNDECLARED" />', {}, {});
    expect(evaluator()).toBe(null);
  });
});

describe('correct expression', () => {
  it('should evaluate correct expression for single cardinality', () => {
    const declarations = {
      RESPONSE: { correctResponse: 'A', baseType: 'identifier', cardinality: 'single' },
    };
    const evaluator = parseQTIExpression('<qti-correct identifier="RESPONSE" />', {}, declarations);
    expect(evaluator()).toBe('A');
  });

  it('should evaluate correct expression for multiple cardinality', () => {
    const declarations = {
      RESPONSE: { correctResponse: ['A', 'B'], baseType: 'identifier', cardinality: 'multiple' },
    };
    const evaluator = parseQTIExpression('<qti-correct identifier="RESPONSE" />', {}, declarations);
    expect(evaluator()).toEqual(['A', 'B']);
  });

  it('should return null when no correct response defined', () => {
    const declarations = {
      RESPONSE: { baseType: 'identifier', cardinality: 'single' },
    };
    const evaluator = parseQTIExpression('<qti-correct identifier="RESPONSE" />', {}, declarations);
    expect(evaluator()).toBe(null);
  });

  it('should return null when identifier not declared', () => {
    const evaluator = parseQTIExpression('<qti-correct identifier="UNDECLARED" />', {}, {});
    expect(evaluator()).toBe(null);
  });
});

describe('map-response operator', () => {
  it('should map single value using declaration mapping', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl(
        'RESPONSE',
        'identifier',
        'single',
        `
          <qti-mapping default-value="0">
            <qti-map-entry map-key="A" mapped-value="1" />
            <qti-map-entry map-key="B" mapped-value="0.5" />
            <qti-map-entry map-key="C" mapped-value="0" />
          </qti-mapping>`,
      ),
      op('map-response', { identifier: 'RESPONSE' }),
    );
    variables.RESPONSE = 'A';
    expect(evaluateNode(exprNode, variables, declarations)).toBe(1);
  });

  it('should sum mapped values for multiple cardinality', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl(
        'RESPONSE',
        'identifier',
        'multiple',
        `
          <qti-mapping default-value="0">
            <qti-map-entry map-key="A" mapped-value="1" />
            <qti-map-entry map-key="B" mapped-value="0.5" />
          </qti-mapping>`,
      ),
      op('map-response', { identifier: 'RESPONSE' }),
    );
    variables.RESPONSE = ['A', 'B'];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(1.5);
  });

  it('should count duplicate values only once', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl(
        'RESPONSE',
        'identifier',
        'multiple',
        `
          <qti-mapping default-value="0">
            <qti-map-entry map-key="A" mapped-value="1" />
            <qti-map-entry map-key="B" mapped-value="0.5" />
          </qti-mapping>`,
      ),
      op('map-response', { identifier: 'RESPONSE' }),
    );
    variables.RESPONSE = ['A', 'A', 'B'];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(1.5); // A counted once + B
  });

  it('should use default value for unmapped responses', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl(
        'RESPONSE',
        'identifier',
        'single',
        `
          <qti-mapping default-value="-0.5">
            <qti-map-entry map-key="A" mapped-value="1" />
          </qti-mapping>`,
      ),
      op('map-response', { identifier: 'RESPONSE' }),
    );
    variables.RESPONSE = 'Z';
    expect(evaluateNode(exprNode, variables, declarations)).toBe(-0.5);
  });

  it('should apply lower and upper bounds', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl(
        'RESPONSE',
        'identifier',
        'multiple',
        `
          <qti-mapping default-value="0" lower-bound="0" upper-bound="2">
            <qti-map-entry map-key="A" mapped-value="1" />
            <qti-map-entry map-key="B" mapped-value="1" />
            <qti-map-entry map-key="C" mapped-value="1" />
          </qti-mapping>`,
      ),
      op('map-response', { identifier: 'RESPONSE' }),
    );
    variables.RESPONSE = ['A', 'B', 'C'];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(2); // Capped at upperBound
  });

  it('should return default when response is null', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl(
        'RESPONSE',
        'identifier',
        'single',
        `
          <qti-mapping default-value="0">
            <qti-map-entry map-key="A" mapped-value="1" />
          </qti-mapping>`,
      ),
      op('map-response', { identifier: 'RESPONSE' }),
    );
    variables.RESPONSE = null;
    expect(evaluateNode(exprNode, variables, declarations)).toBe(0);
  });

  it('should return null when no mapping defined', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESPONSE', 'identifier'),
      op('map-response', { identifier: 'RESPONSE' }),
    );
    variables.RESPONSE = 'A';
    expect(evaluateNode(exprNode, variables, declarations)).toBe(null);
  });

  it('should warn when declaration has no mapping capability', () => {
    mockWarn.mockClear();
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESPONSE', 'identifier'),
      op('map-response', { identifier: 'RESPONSE' }),
    );
    variables.RESPONSE = 'A';
    evaluateNode(exprNode, variables, declarations);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('RESPONSE'));
  });
});

describe('map-response-point operator', () => {
  // Build a map-response-point expression with a given cardinality, default, entries, and bounds.
  // entries: array of { shape, coords, value }
  // bounds:  optional { lower, upper }
  function buildMapPoint({ cardinality = 'single', defaultValue = 0, entries, bounds = {} }) {
    const mappingAttrs = { 'default-value': defaultValue };
    if (bounds.lower !== undefined) mappingAttrs['lower-bound'] = bounds.lower;
    if (bounds.upper !== undefined) mappingAttrs['upper-bound'] = bounds.upper;
    const entryXml = entries
      .map(e =>
        op('area-map-entry', {
          shape: e.shape,
          coords: e.coords,
          'mapped-value': e.value,
        }),
      )
      .join('');
    return assessmentExpr(
      responseDecl('RESPONSE', 'point', cardinality, op('area-mapping', mappingAttrs, entryXml)),
      op('map-response-point', { identifier: 'RESPONSE' }),
    );
  }

  // Single-cardinality shape mapping cases.
  // Each row: [label, shape, coords, mappedValue, responsePoint, expected]
  it.each([
    ['inside circle area', 'circle', '100,100,50', 1, [100, 100], 1],
    ['outside all areas → default', 'circle', '100,100,50', 1, [200, 200], 0, { defaultValue: 0 }],
    ['inside rect area', 'rect', '0,0,100,100', 2, [50, 50], 2],
    ['inside polygon area', 'poly', '0,0,100,0,100,100,0,100', 3, [50, 50], 3],
    ['inside ellipse area', 'ellipse', '100,100,50,30', 1.5, [100, 100], 1.5],
    [
      'outside ellipse → default',
      'ellipse',
      '100,100,50,30',
      1,
      [200, 200],
      -0.5,
      { defaultValue: -0.5 },
    ],
  ])('single %s', (_label, shape, coords, value, response, expected, opts = {}) => {
    const { declarations, variables, exprNode } = buildMapPoint({
      cardinality: 'single',
      defaultValue: opts.defaultValue ?? 0,
      entries: [{ shape, coords, value }],
    });
    variables.RESPONSE = response;
    expect(evaluateNode(exprNode, variables, declarations)).toBe(expected);
  });

  it('should return default when point outside all areas', () => {
    // Spelled out since it explicitly asserts the negative default case.
    const { declarations, variables, exprNode } = buildMapPoint({
      defaultValue: -0.5,
      entries: [{ shape: 'circle', coords: '100,100,50', value: 1 }],
    });
    variables.RESPONSE = [200, 200];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(-0.5);
  });

  it('should count each area only once for multiple points hitting the same area', () => {
    const { declarations, variables, exprNode } = buildMapPoint({
      cardinality: 'multiple',
      entries: [{ shape: 'circle', coords: '100,100,50', value: 1 }],
    });
    variables.RESPONSE = [
      [100, 100],
      [110, 110],
    ];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(1);
  });

  it('should sum values from multiple areas hit by different points', () => {
    const { declarations, variables, exprNode } = buildMapPoint({
      cardinality: 'multiple',
      entries: [
        { shape: 'circle', coords: '50,50,30', value: 1 },
        { shape: 'circle', coords: '150,150,30', value: 2 },
      ],
    });
    variables.RESPONSE = [
      [50, 50],
      [150, 150],
    ];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(3);
  });

  it('should apply lower and upper bounds', () => {
    const { declarations, variables, exprNode } = buildMapPoint({
      cardinality: 'multiple',
      bounds: { lower: 0, upper: 3 },
      entries: [
        { shape: 'circle', coords: '50,50,30', value: 2 },
        { shape: 'circle', coords: '150,150,30', value: 2 },
      ],
    });
    variables.RESPONSE = [
      [50, 50],
      [150, 150],
    ];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(3); // Capped at upperBound
  });

  it('should return default when response is null', () => {
    const { declarations, variables, exprNode } = buildMapPoint({
      entries: [{ shape: 'circle', coords: '100,100,50', value: 1 }],
    });
    variables.RESPONSE = null;
    expect(evaluateNode(exprNode, variables, declarations)).toBe(0);
  });

  it('should apply default for points that miss all areas (partial hit)', () => {
    const { declarations, variables, exprNode } = buildMapPoint({
      cardinality: 'multiple',
      defaultValue: -1,
      entries: [{ shape: 'circle', coords: '50,50,20', value: 2 }],
    });
    variables.RESPONSE = [
      [50, 50],
      [200, 200],
    ];
    // Circle was hit once = 2, one point missed = default(-1), total = 1
    expect(evaluateNode(exprNode, variables, declarations)).toBe(1);
  });

  it('should warn when declaration has no area mapping capability', () => {
    mockWarn.mockClear();
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESPONSE', 'point'),
      op('map-response-point', { identifier: 'RESPONSE' }),
    );
    variables.RESPONSE = [50, 50];
    evaluateNode(exprNode, variables, declarations);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('RESPONSE'));
  });
});

describe('math operators - extended', () => {
  it('should evaluate truncate (toward zero)', () => {
    expect(parseQTIExpression(op('truncate', baseValue('float', 3.7)), {})()).toBe(3);
    expect(parseQTIExpression(op('truncate', baseValue('float', -3.7)), {})()).toBe(-3);
  });

  it('should evaluate integer-divide', () => {
    const evaluator = parseQTIExpression(
      op('integer-divide', baseValue('integer', 7), baseValue('integer', 3)),
      {},
    );
    expect(evaluator()).toBe(2);
  });

  it('should return null for integer-divide by zero', () => {
    const evaluator = parseQTIExpression(
      op('integer-divide', baseValue('integer', 7), baseValue('integer', 0)),
      {},
    );
    expect(evaluator()).toBe(null);
  });

  // integer-modulus follows JS %: sign of the result matches the dividend.
  // [a, b, expected] — b=0 returns NULL per v3 section 2.11.3.25
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpIntModulus
  it.each([
    [7, 3, 1],
    [7, 0, null], // divide by zero
    [-7, 3, -1], // negative dividend
    [7, -3, 1], // negative divisor
    [-7, -3, -1], // both negative
  ])('integer-modulus(%d, %d) → %p', (a, b, expected) => {
    const evaluator = parseQTIExpression(
      `<qti-integer-modulus><qti-base-value base-type="integer">${a}</qti-base-value><qti-base-value base-type="integer">${b}</qti-base-value></qti-integer-modulus>`,
      {},
    );
    expect(evaluator()).toBe(expected);
  });

  it('should evaluate integer-to-float', () => {
    const evaluator = parseQTIExpression(op('integer-to-float', baseValue('integer', 42)), {});
    expect(evaluator()).toBe(42.0);
  });

  it('should return null for integer-to-float with null input', () => {
    const variables = { VAL: null };
    const evaluator = parseQTIExpression(op('integer-to-float', variable('VAL')), variables);
    expect(evaluator()).toBe(null);
  });

  // Happy-path gcd/lcm across varying number of args and signs.
  // [op, values, expected]
  const intVals = vs =>
    vs.map(v => `<qti-base-value base-type="integer">${v}</qti-base-value>`).join('');
  it.each([
    ['qti-gcd', [12, 18], 6],
    ['qti-gcd', [12, 18, 24], 6],
    ['qti-gcd', [-12, 18], 6], // negative input
    ['qti-lcm', [4, 6], 12],
    ['qti-lcm', [4, 6, 8], 24],
    ['qti-lcm', [4, 0], 0], // 0 propagates to 0 in lcm
  ])('%s(%p) → %d', (op, values, expected) => {
    const evaluator = parseQTIExpression(`<${op}>${intVals(values)}</${op}>`, {});
    expect(evaluator()).toBe(expected);
  });

  it('should return null for gcd/lcm with no non-null values', () => {
    const variables = { VAL: null };
    for (const tag of ['gcd', 'lcm']) {
      const evaluator = parseQTIExpression(op(tag, variable('VAL')), variables);
      expect(evaluator()).toBe(null);
    }
  });

  it('should evaluate lcm with large numbers without overflow', () => {
    const evaluator = parseQTIExpression(
      op('lcm', baseValue('integer', 9999999999999), baseValue('integer', 9999999999998)),
      {},
    );
    const result = evaluator();
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  // lcm should always return a non-negative result, regardless of input sign.
  it.each([
    ['both negative', -4, -6],
    ['one negative', 4, -6],
  ])('lcm with %s returns non-negative 12', (_label, a, b) => {
    const evaluator = parseQTIExpression(
      `<qti-lcm><qti-base-value base-type="integer">${a}</qti-base-value><qti-base-value base-type="integer">${b}</qti-base-value></qti-lcm>`,
      {},
    );
    expect(evaluator()).toBe(12);
  });
});

describe('round operator', () => {
  // qti-round uses Math.round semantics (negative .5 rounds toward zero in JS).
  // [input, type, expected]
  it.each([
    [3.4, 'float', 3], // positive rounds down
    [3.5, 'float', 4], // positive .5 rounds up
    [-3.5, 'float', -3], // negative .5 rounds toward zero (JS Math.round)
    [-3.6, 'float', -4], // negative rounds away from zero
    [5, 'integer', 5], // integer unchanged
  ])('round(%p) → %p', (input, type, expected) => {
    const evaluator = parseQTIExpression(
      `<qti-round><qti-base-value base-type="${type}">${input}</qti-base-value></qti-round>`,
      {},
    );
    expect(evaluator()).toBe(expected);
  });

  it('should return null for null input', () => {
    const evaluator = parseQTIExpression(op('round', variable('VAL')), { VAL: null });
    expect(evaluator()).toBe(null);
  });
});

describe('round-to operator', () => {
  // Build a qti-round-to expression with given attrs and a float input.
  // mode defaults to the qti spec default (significantFigures) if omitted.
  function roundTo(figures, mode, input) {
    const modeAttr = mode ? ` rounding-mode="${mode}"` : '';
    return `<qti-round-to figures="${figures}"${modeAttr}><qti-base-value base-type="float">${input}</qti-base-value></qti-round-to>`;
  }

  // [label, figures, mode, input, expected, matcher]
  // mode=null tests the default (significantFigures).
  // figures=0 is valid for decimalPlaces (rounds to integer) but invalid for
  // significantFigures (produces NaN via log10 → null).
  it.each([
    ['decimal places', 2, 'decimalPlaces', 1.23456, 1.23, 'toBeCloseTo'],
    ['significant figures', 3, 'significantFigures', 12345, 12300, 'toBe'],
    ['default mode is significantFigures', 2, null, 123.456, 120, 'toBe'],
    ['0 with significantFigures returns 0', 3, 'significantFigures', 0, 0, 'toBe'],
    ['negative number with decimalPlaces', 1, 'decimalPlaces', -1.26, -1.3, 'toBeCloseTo'],
    ['figures=0 invalid for significantFigures', 0, 'significantFigures', 3.14, null, 'toBe'],
    ['figures=0 in decimalPlaces rounds to integer', 0, 'decimalPlaces', 3.14, 3, 'toBe'],
    [
      'small numbers with significantFigures',
      2,
      'significantFigures',
      0.001234,
      0.0012,
      'toBeCloseTo',
    ],
  ])('should handle %s', (_label, figures, mode, input, expected, matcher) => {
    const result = parseQTIExpression(roundTo(figures, mode, input), {})();
    if (expected === null) expect(result).toBe(null);
    else if (matcher === 'toBeCloseTo') expect(result).toBeCloseTo(expected);
    else expect(result).toBe(expected);
  });

  it('should return null for null input', () => {
    const evaluator = parseQTIExpression(
      op('round-to', { figures: '2', 'rounding-mode': 'decimalPlaces' }, variable('VAL')),
      { VAL: null },
    );
    expect(evaluator()).toBe(null);
  });
});

describe('math-constant operator', () => {
  it.each([
    ['pi', Math.PI],
    ['e', Math.E],
    ['unknown', null],
  ])('name="%s" returns %p', (name, expected) => {
    const evaluator = parseQTIExpression(op('math-constant', { name }), {});
    if (expected === null) {
      expect(evaluator()).toBe(null);
    } else {
      expect(evaluator()).toBeCloseTo(expected);
    }
  });
});

describe('math-operator', () => {
  // Helper: wrap a value or an expression as a math-operator argument.
  const floatArg = v => baseValue('float', v);

  // Build a qti-math-operator expression with one or more argument XML strings.
  const mathOp = (name, args) => op('math-operator', { name }, ...args);

  // Tabulate operators that take a single numeric input and return an expected value.
  // Each entry: [name, input, expected, matcher]
  //   matcher: 'toBe' for exact, 'toBeCloseTo' for floating-point. Default 'toBe'.
  describe.each([
    ['sin', 0, 0, 'toBe'],
    ['cos', 0, 1, 'toBe'],
    ['tan', 0, 0, 'toBe'],
    ['asin', 0, 0, 'toBe'],
    ['asin', 2, null, 'toBe'], // outside domain
    ['acos', 1, 0, 'toBe'],
    ['acos', 2, null, 'toBe'], // outside domain
    ['atan', 0, 0, 'toBe'],
    ['sinh', 0, 0, 'toBe'],
    ['cosh', 0, 1, 'toBe'],
    ['tanh', 0, 0, 'toBe'],
    ['abs', -5, 5, 'toBe'],
    ['floor', 3.7, 3, 'toBe'],
    ['ceil', 3.2, 4, 'toBe'],
    ['exp', 1, Math.E, 'toBeCloseTo'],
    ['ln', 0, null, 'toBe'], // non-positive
    ['log', 100, 2, 'toBe'], // log10
    ['sqrt', 16, 4, 'toBe'],
    ['sqrt', -4, null, 'toBe'], // negative
    ['toRadians', 180, Math.PI, 'toBeCloseTo'],
    ['cot', Math.PI / 4, 1, 'toBeCloseTo'],
    ['sec', 0, 1, 'toBe'],
    ['csc', Math.PI / 2, 1, 'toBeCloseTo'],
    ['acot', 1, Math.PI / 4, 'toBeCloseTo'],
    ['asec', 1, 0, 'toBe'],
    ['asec', 0.5, null, 'toBe'], // in (-1, 1)
    ['acsc', 1, Math.PI / 2, 'toBeCloseTo'],
    ['acsc', 0.5, null, 'toBe'], // in (-1, 1)
    ['coth', 1, 1 / Math.tanh(1), 'toBeCloseTo'],
    ['sech', 0, 1, 'toBe'],
    ['csch', 1, 1 / Math.sinh(1), 'toBeCloseTo'],
    ['coth', 0, null, 'toBe'], // singularity
    ['csch', 0, null, 'toBe'], // singularity
    ['cot', 0, null, 'toBe'], // singularity
    ['csc', 0, null, 'toBe'], // singularity
    ['signum', 5, 1, 'toBe'],
    ['signum', -5, -1, 'toBe'],
    ['signum', 0, 0, 'toBe'],
  ])('%s(%s)', (name, input, expected, matcher) => {
    it(`returns ${expected}`, () => {
      const evaluator = parseQTIExpression(mathOp(name, [floatArg(input)]), {});
      if (expected === null) {
        expect(evaluator()).toBe(null);
      } else if (matcher === 'toBeCloseTo') {
        expect(evaluator()).toBeCloseTo(expected);
      } else {
        expect(evaluator()).toBe(expected);
      }
    });
  });

  it('should evaluate ln using qti-math-constant e', () => {
    // Uses a non-base-value argument, so kept separate from the table above.
    const evaluator = parseQTIExpression(mathOp('ln', [op('math-constant', { name: 'e' })]), {});
    expect(evaluator()).toBeCloseTo(1);
  });

  it('should evaluate toDegrees(pi)', () => {
    const evaluator = parseQTIExpression(
      mathOp('toDegrees', [op('math-constant', { name: 'pi' })]),
      {},
    );
    expect(evaluator()).toBeCloseTo(180);
  });

  it('should evaluate atan2 (two arguments)', () => {
    const evaluator = parseQTIExpression(mathOp('atan2', [floatArg(1), floatArg(1)]), {});
    expect(evaluator()).toBeCloseTo(Math.PI / 4);
  });

  it('should return null for null input', () => {
    const variables = { VAL: null };
    const evaluator = parseQTIExpression(mathOp('sin', [variable('VAL')]), variables);
    expect(evaluator()).toBe(null);
  });

  it('should return null for unknown operator', () => {
    const evaluator = parseQTIExpression(mathOp('unknown', [floatArg(1)]), {});
    expect(evaluator()).toBe(null);
  });
});

describe('stats-operator', () => {
  // Evaluate a qti-stats-operator with the given name against SCORES variable.
  // matcher: 'toBe' for exact, 'toBeCloseTo' for approximate (default 'toBe').
  function runStats(name, scores, matcher = 'toBe') {
    const evaluator = parseQTIExpression(op('stats-operator', { name }, variable('SCORES')), {
      SCORES: scores,
    });
    return { result: evaluator(), matcher };
  }

  // Happy-path calculations for each supported stats operator.
  // Input [2,4,4,4,5,5,7,9] is the canonical Wikipedia example with popSD=2.
  it.each([
    ['mean', [10, 20, 30], 20, 'toBe'],
    ['popVariance', [2, 4, 4, 4, 5, 5, 7, 9], 4, 'toBe'],
    ['popSD', [2, 4, 4, 4, 5, 5, 7, 9], 2, 'toBe'],
    ['sampleVariance', [2, 4, 4, 4, 5, 5, 7, 9], 4.571, 'toBeCloseTo'],
    ['sampleSD', [2, 4, 4, 4, 5, 5, 7, 9], 2.138, 'toBeCloseTo'],
  ])('should calculate %s', (name, scores, expected, matcher) => {
    const { result } = runStats(name, scores, matcher);
    if (matcher === 'toBeCloseTo') {
      expect(result).toBeCloseTo(expected, 2);
    } else {
      expect(result).toBe(expected);
    }
  });

  // Null-result edge cases: empty container, non-array input, sample
  // variants with a single element (n-1 = 0 → undefined), and null
  // elements inside the container. qti-stats-operator returns NULL if the
  // sub-expression or any value contained therein is NULL — v3 section
  // 2.11.3.44
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpStatsOp
  it.each([
    ['empty container', 'mean', []],
    ['non-array value', 'mean', 5],
    ['sampleVariance with single element', 'sampleVariance', [5]],
    ['sampleSD with single element', 'sampleSD', [5]],
    ['container with null elements (mean)', 'mean', [10, null, 20]],
    ['container with null elements (popVariance)', 'popVariance', [1, null, 3]],
  ])('should return null for %s', (_label, name, scores) => {
    expect(runStats(name, scores).result).toBe(null);
  });
});

describe('random operators', () => {
  it('should generate random integer in range', () => {
    const evaluator = parseQTIExpression(op('random-integer', { min: '1', max: '10' }), {});
    for (let i = 0; i < 100; i++) {
      const result = evaluator();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('should generate random integer with step', () => {
    const evaluator = parseQTIExpression(
      op('random-integer', { min: '0', max: '10', step: '2' }),
      {},
    );
    for (let i = 0; i < 100; i++) {
      const result = evaluator();
      expect(result % 2).toBe(0);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  it('should generate random float in range', () => {
    const evaluator = parseQTIExpression(op('random-float', { min: '0', max: '1' }), {});
    for (let i = 0; i < 100; i++) {
      const result = evaluator();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it('should select random value from container', () => {
    const variables = { CHOICES: ['A', 'B', 'C'] };
    const evaluator = parseQTIExpression(op('random', variable('CHOICES')), variables);
    for (let i = 0; i < 100; i++) {
      expect(['A', 'B', 'C']).toContain(evaluator());
    }
  });

  it('should return null for empty container', () => {
    const variables = { EMPTY: [] };
    const evaluator = parseQTIExpression(op('random', variable('EMPTY')), variables);
    expect(evaluator()).toBe(null);
  });

  it('should return null for null container', () => {
    const variables = { EMPTY: null };
    const evaluator = parseQTIExpression(op('random', variable('EMPTY')), variables);
    expect(evaluator()).toBe(null);
  });
});

describe('equal-rounded operator', () => {
  // [label, figures, mode, a, b, expected]
  // mode=null → default (significantFigures).
  it.each([
    ['decimalPlaces matches when rounded equal', 1, 'decimalPlaces', 1.14, 1.12, true], // both 1.1
    ['decimalPlaces false when rounded differ', 1, 'decimalPlaces', 1.14, 1.26, false], // 1.1 vs 1.3
    ['significantFigures matches', 2, 'significantFigures', 12345, 12400, true], // both 12000
    ['default mode (significantFigures)', 2, null, 123, 119, true], // both 120
  ])('%s', (_label, figures, mode, a, b, expected) => {
    const modeAttr = mode ? ` rounding-mode="${mode}"` : '';
    const evaluator = parseQTIExpression(
      `<qti-equal-rounded figures="${figures}"${modeAttr}><qti-base-value base-type="float">${a}</qti-base-value><qti-base-value base-type="float">${b}</qti-base-value></qti-equal-rounded>`,
      {},
    );
    expect(evaluator()).toBe(expected);
  });

  it('should return null when either value is null', () => {
    const evaluator = parseQTIExpression(
      `<qti-equal-rounded figures="2" rounding-mode="decimalPlaces"><qti-variable identifier="VAL" /><qti-base-value base-type="float">1.23</qti-base-value></qti-equal-rounded>`,
      { VAL: null },
    );
    expect(evaluator()).toBe(null);
  });
});

describe('inside operator', () => {
  // [shape, coords, point, expected] — one test row per shape × inside/outside case.
  it.each([
    ['circle', '100,100,50', '100 100', true],
    ['circle', '100,100,50', '200 200', false],
    ['rect', '0,0,100,100', '50 50', true],
    ['rect', '0,0,100,100', '150 150', false],
    ['poly', '0,0,100,0,100,100,0,100', '50 50', true],
    ['poly', '0,0,100,0,100,100,0,100', '150 150', false],
    ['ellipse', '100,100,50,30', '100 100', true],
    ['ellipse', '100,100,50,30', '200 200', false],
  ])('shape=%s coords=%s point=%s → %p', (shape, coords, point, expected) => {
    const evaluator = parseQTIExpression(
      `
      <qti-inside shape="${shape}" coords="${coords}">
        <qti-base-value base-type="point">${point}</qti-base-value>
      </qti-inside>
    `,
      {},
    );
    expect(evaluator()).toBe(expected);
  });

  it('should return true for default shape', () => {
    const evaluator = parseQTIExpression(
      op('inside', { shape: 'default', coords: '' }, baseValue('point', '999 999')),
      {},
    );
    expect(evaluator()).toBe(true);
  });

  it('should return true if any point in container is inside', () => {
    const variables = {
      POINTS: [
        [50, 50],
        [200, 200],
      ],
    };
    const evaluator = parseQTIExpression(
      op('inside', { shape: 'rect', coords: '0,0,100,100' }, variable('POINTS')),
      variables,
    );
    expect(evaluator()).toBe(true);
  });

  it('should return false if no point in container is inside', () => {
    const variables = {
      POINTS: [
        [150, 150],
        [200, 200],
      ],
    };
    const evaluator = parseQTIExpression(
      op('inside', { shape: 'rect', coords: '0,0,100,100' }, variable('POINTS')),
      variables,
    );
    expect(evaluator()).toBe(false);
  });

  it('should return null for null value', () => {
    const variables = { POINT: null };
    const evaluator = parseQTIExpression(
      op('inside', { shape: 'circle', coords: '100,100,50' }, variable('POINT')),
      variables,
    );
    expect(evaluator()).toBe(null);
  });

  // qti-inside propagates NULL when either sub-expression is NULL — see
  // v3 section 2.11.3.7
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpInside
  // A NULL element inside a container of points is a NULL operand for
  // this rule.
  it('should return null when a container of points contains a null element', () => {
    const variables = { POINTS: [[50, 50], null, [300, 300]] };
    const declarations = {
      POINTS: { cardinality: 'multiple', baseType: 'point', value: variables.POINTS },
    };
    const evaluator = parseQTIExpression(
      op('inside', { shape: 'rect', coords: '0,0,100,100' }, variable('POINTS')),
      variables,
      declarations,
    );
    expect(evaluator()).toBe(null);
  });
});

describe('any-n operator', () => {
  // Build qti-any-n XML from an array of children (true|false|null) and optional min/max attrs.
  // true/false produce base-value elements; null produces a variable reference to inject null.
  function anyN(children, attrs) {
    const variables = {};
    const childXml = children
      .map((c, i) => {
        if (c === null) {
          const id = `V${i}`;
          variables[id] = null;
          return `<qti-variable identifier="${id}" />`;
        }
        return `<qti-base-value base-type="boolean">${c}</qti-base-value>`;
      })
      .join('');
    const attrStr = Object.entries(attrs)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    return { xml: `<qti-any-n ${attrStr}>${childXml}</qti-any-n>`, variables };
  }

  // Literal boolean children — covers basic min/max thresholds and defaults.
  // [children, { min, max }, expected]
  it.each([
    [[true, true, false], { min: 2 }, true], // count >= min
    [[true, true, false], { min: 3 }, false], // count < min
    [[true, true, true], { min: 1, max: 2 }, false], // count > max
    [[true, true, false], { min: 2, max: 2 }, true], // count exactly in range
    [[false, false], { max: 2 }, true], // min defaults to 0
    [[true, true, true, true, true], { min: 1 }, true], // max defaults to Infinity
    [[true], { min: 0, max: 0 }, false], // max=0, 1 true → false
    [[false], { min: 0, max: 0 }, true], // max=0, 0 true → true
  ])('bool children %p with %p → %p', (children, attrs, expected) => {
    const { xml, variables } = anyN(children, attrs);
    expect(parseQTIExpression(xml, variables)()).toBe(expected);
  });

  // Null-child three-valued logic cases. Comment explains the indeterminacy.
  it.each([
    // {true, true, false, null} with [3,4] → null (count=2 definite, but null might push to 3)
    [[true, true, false, null], { min: 3, max: 4 }, null],
    // {true, false, false, null} with [3,4] → false (even if null=true, max count=2 < min)
    [[true, false, false, null], { min: 3, max: 4 }, false],
    // {true, true, true, null} with [3,4] → true (min already satisfied; null can't push above max)
    [[true, true, true, null], { min: 3, max: 4 }, true],
    // {true, null, null} with [1,1] → null (count=1 in range, but nulls could push above max=1)
    [[true, null, null], { min: 1, max: 1 }, null],
    // {true, null} with [1,2] → true (count=1 in range, nulls can't push above max=2)
    [[true, null], { min: 1, max: 2 }, true],
  ])('null-aware children %p with %p → %p', (children, attrs, expected) => {
    const { xml, variables } = anyN(children, attrs);
    expect(parseQTIExpression(xml, variables)()).toBe(expected);
  });

  it('should work with nested expressions', () => {
    const variables = { A: 10, B: 5, C: 3 };
    const evaluator = parseQTIExpression(
      op(
        'any-n',
        { min: '2', max: '3' },
        op('gt', variable('A'), baseValue('integer', 5)),
        op('gt', variable('B'), baseValue('integer', 3)),
        op('gt', variable('C'), baseValue('integer', 5)),
      ),
      variables,
    );
    // A > 5 = true, B > 3 = true, C > 5 = false => 2 true, within [2,3]
    expect(evaluator()).toBe(true);
  });
});

describe('container operators', () => {
  it('should get item at index (1-based)', () => {
    const variables = { ITEMS: ['A', 'B', 'C'] };
    const evaluator = parseQTIExpression(op('index', { n: '2' }, variable('ITEMS')), variables);
    expect(evaluator()).toBe('B');
  });

  // Edge cases for qti-index that all return null: out-of-bounds, 0 (1-based),
  // negative, and applying to a non-array.
  it.each([
    ['out-of-bounds index', 5, { ITEMS: ['A', 'B'] }, 'ITEMS'],
    ['index 0 (1-based)', 0, { ITEMS: ['A', 'B', 'C'] }, 'ITEMS'],
    ['negative index', -1, { ITEMS: ['A', 'B', 'C'] }, 'ITEMS'],
    ['index on non-array', 1, { ITEM: 'single' }, 'ITEM'],
  ])('should return null for %s', (_label, n, variables, refId) => {
    const evaluator = parseQTIExpression(
      `<qti-index n="${n}"><qti-variable identifier="${refId}" /></qti-index>`,
      variables,
    );
    expect(evaluator()).toBe(null);
  });

  it('should delete value from container', () => {
    const variables = { ITEMS: ['A', 'B', 'C'] };
    const evaluator = parseQTIExpression(
      op('delete', variable('ITEMS'), baseValue('identifier', 'B')),
      variables,
    );
    expect(evaluator()).toEqual(['A', 'C']);
  });

  it('should delete multiple values from container', () => {
    const variables = { ITEMS: ['A', 'B', 'C', 'D'] };
    const evaluator = parseQTIExpression(
      op('delete', variable('ITEMS'), baseValue('identifier', 'B'), baseValue('identifier', 'D')),
      variables,
    );
    expect(evaluator()).toEqual(['A', 'C']);
  });

  it('should return original container when value to delete not found', () => {
    const variables = { ITEMS: ['A', 'B', 'C'] };
    const evaluator = parseQTIExpression(
      op('delete', variable('ITEMS'), baseValue('identifier', 'Z')),
      variables,
    );
    expect(evaluator()).toEqual(['A', 'B', 'C']);
  });

  it('should return null when a deletion target is null (NULL propagation)', () => {
    // qti-delete returns NULL if either sub-expression is NULL — v3
    // section 2.11.3.18
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpDelete
    const variables = { ITEMS: ['A', 'B', 'C'], MISSING: null };
    const evaluator = parseQTIExpression(
      op('delete', variable('ITEMS'), variable('MISSING')),
      variables,
    );
    expect(evaluator()).toBe(null);
  });

  it('should return null for delete on non-array', () => {
    const variables = { ITEM: 'single' };
    const evaluator = parseQTIExpression(
      op('delete', variable('ITEM'), baseValue('identifier', 'single')),
      variables,
    );
    expect(evaluator()).toBe(null);
  });

  it('should delete a point value from a container of points', () => {
    const variables = {
      POINTS: [
        [100, 200],
        [300, 400],
        [500, 600],
      ],
    };
    const evaluator = parseQTIExpression(
      op('delete', variable('POINTS'), baseValue('point', '300 400')),
      variables,
    );
    expect(evaluator()).toEqual([
      [100, 200],
      [500, 600],
    ]);
  });

  // qti-multiple and qti-ordered share behavior: build containers, filter nulls,
  // flatten nested containers. [op, label, childrenXml, variables, expected]
  it.each([
    [
      'qti-multiple',
      'basic construction',
      '<qti-base-value base-type="identifier">A</qti-base-value><qti-base-value base-type="identifier">B</qti-base-value>',
      {},
      ['A', 'B'],
    ],
    [
      'qti-multiple',
      'filters null values',
      '<qti-base-value base-type="identifier">A</qti-base-value><qti-variable identifier="VAL" /><qti-base-value base-type="identifier">B</qti-base-value>',
      { VAL: null },
      ['A', 'B'],
    ],
    [
      'qti-multiple',
      'flattens nested containers',
      '<qti-base-value base-type="identifier">A</qti-base-value><qti-variable identifier="NESTED" /><qti-base-value base-type="identifier">B</qti-base-value>',
      { NESTED: ['X', 'Y'] },
      ['A', 'X', 'Y', 'B'],
    ],
    [
      'qti-ordered',
      'basic construction (preserves order)',
      '<qti-base-value base-type="identifier">C</qti-base-value><qti-base-value base-type="identifier">A</qti-base-value><qti-base-value base-type="identifier">B</qti-base-value>',
      {},
      ['C', 'A', 'B'],
    ],
    [
      'qti-ordered',
      'filters null values',
      '<qti-base-value base-type="identifier">A</qti-base-value><qti-variable identifier="VAL" /><qti-base-value base-type="identifier">B</qti-base-value>',
      { VAL: null },
      ['A', 'B'],
    ],
    [
      'qti-ordered',
      'flattens nested containers',
      '<qti-base-value base-type="identifier">A</qti-base-value><qti-variable identifier="NESTED" /><qti-base-value base-type="identifier">B</qti-base-value>',
      { NESTED: ['X', 'Y'] },
      ['A', 'X', 'Y', 'B'],
    ],
  ])('%s: %s', (op, _label, children, variables, expected) => {
    const evaluator = parseQTIExpression(`<${op}>${children}</${op}>`, variables);
    expect(evaluator()).toEqual(expected);
  });

  it('should add single pair values as whole elements in multiple, not flatten them', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      [responseDecl('PAIR1', 'pair'), responseDecl('PAIR2', 'pair')],
      op('multiple', variable('PAIR1'), variable('PAIR2')),
    );
    variables.PAIR1 = ['A', 'B'];
    variables.PAIR2 = ['C', 'D'];
    // Single pairs should be added as unit elements, not flattened
    expect(evaluateNode(exprNode, variables, declarations)).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
  });

  it('should add single point values as whole elements in ordered, not flatten them', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      [responseDecl('P1', 'point'), responseDecl('P2', 'point')],
      op('ordered', variable('P1'), variable('P2')),
    );
    variables.P1 = [100, 200];
    variables.P2 = [300, 400];
    expect(evaluateNode(exprNode, variables, declarations)).toEqual([
      [100, 200],
      [300, 400],
    ]);
  });

  it('should flatten container of pairs but not single pairs in mixed multiple', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      [responseDecl('SINGLE_PAIR', 'pair'), responseDecl('PAIR_CONTAINER', 'pair', 'multiple')],
      op('multiple', variable('SINGLE_PAIR'), variable('PAIR_CONTAINER')),
    );
    variables.SINGLE_PAIR = ['E', 'F'];
    variables.PAIR_CONTAINER = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    // SINGLE_PAIR added as one element; PAIR_CONTAINER flattened to two elements
    expect(evaluateNode(exprNode, variables, declarations)).toEqual([
      ['E', 'F'],
      ['A', 'B'],
      ['C', 'D'],
    ]);
  });

  // field-value: [label, field, recordValue, expected]
  it.each([
    ['extract existing field', 'name', { name: 'John', age: 30 }, 'John'],
    ['non-existent field returns null', 'email', { name: 'John', age: 30 }, null],
    ['null record returns null', 'name', null, null],
    ['non-object record returns null', 'name', 'not an object', null],
  ])('field-value: %s', (_label, field, record, expected) => {
    const evaluator = parseQTIExpression(
      `<qti-field-value field-identifier="${field}"><qti-variable identifier="RECORD" /></qti-field-value>`,
      { RECORD: record },
    );
    expect(evaluator()).toBe(expected);
  });
});

describe('repeat operator', () => {
  // Basic repeat behavior: n iterations of a single child.
  // [label, iterations, childXml, variables, expected]
  it.each([
    [
      'literal integer repeated 3x',
      '3',
      '<qti-base-value base-type="integer">1</qti-base-value>',
      {},
      [1, 1, 1],
    ],
    [
      '0 iterations → empty array',
      '0',
      '<qti-base-value base-type="integer">5</qti-base-value>',
      {},
      [],
    ],
    [
      'missing number-of-iterations → empty array',
      null,
      '<qti-base-value base-type="integer">5</qti-base-value>',
      {},
      [],
    ],
    [
      'variable reference repeated 4x',
      '4',
      '<qti-variable identifier="VALUE" />',
      { VALUE: 42 },
      [42, 42, 42, 42],
    ],
    [
      'nested qti-sum repeated 2x',
      '2',
      '<qti-sum><qti-base-value base-type="integer">1</qti-base-value><qti-base-value base-type="integer">2</qti-base-value></qti-sum>',
      {},
      [3, 3],
    ],
  ])('%s', (_label, iter, child, variables, expected) => {
    const iterAttr = iter === null ? '' : ` number-of-iterations="${iter}"`;
    const evaluator = parseQTIExpression(`<qti-repeat${iterAttr}>${child}</qti-repeat>`, variables);
    expect(evaluator()).toEqual(expected);
  });

  it('should exclude NULL sub-expression results, consistent with ordered/multiple', () => {
    // qti-ordered and qti-repeat both state that NULL sub-expressions are
    // ignored — v3 sections 2.11.3.9 and 2.11.3.42
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpOrdered
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpRepeat
    // repeat produces an ordered container, so NULLs are excluded.
    const variables = { PRESENT: 5, MISSING: null };
    const evaluator = parseQTIExpression(
      op('repeat', { 'number-of-iterations': '2' }, variable('PRESENT'), variable('MISSING')),
      variables,
      { PRESENT: { value: 5 }, MISSING: { value: null } },
    );
    // Without NULL filtering: [5, null, 5, null]
    // With NULL filtering: [5, 5]
    expect(evaluator()).toEqual([5, 5]);
  });

  it('should flatten container sub-expressions, consistent with ordered/multiple', () => {
    // repeat produces an ordered container; like qti-ordered, container
    // sub-expressions (qti-multiple, qti-ordered) should be flattened.
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('VALS', 'identifier', 'multiple'),
      op(
        'repeat',
        { 'number-of-iterations': '2' },
        op('multiple', baseValue('identifier', 'A'), baseValue('identifier', 'B')),
      ),
    );

    // Without flattening: [[A, B], [A, B]] (nested arrays)
    // With flattening: [A, B, A, B] (flat ordered container)
    expect(evaluateNode(exprNode, variables, declarations)).toEqual(['A', 'B', 'A', 'B']);
  });

  it('should not flatten single compound values (pair, point)', () => {
    // Pair values are arrays but represent single compound values, not containers.
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('R', 'pair'),
      op('repeat', { 'number-of-iterations': '2' }, baseValue('pair', 'A B')),
    );

    // Each iteration produces ['A', 'B'] as a single compound value.
    // Result: [['A', 'B'], ['A', 'B']], NOT ['A', 'B', 'A', 'B']
    expect(evaluateNode(exprNode, variables, declarations)).toEqual([
      ['A', 'B'],
      ['A', 'B'],
    ]);
  });
});

describe('complex nested expressions', () => {
  it('should evaluate nested mathematical expressions', () => {
    const evaluator = parseQTIExpression(
      op('divide', op('sum', variable('A'), variable('B'), variable('C')), baseValue('integer', 3)),
      { A: 10, B: 20, C: 30 },
    );

    // Should calculate (10 + 20 + 30) / 3 = 20
    expect(evaluator()).toBe(20);
  });

  it('should evaluate nested logical expressions', () => {
    const variables = { SCORE: 75, ATTEMPTS: 2 };
    const evaluator = parseQTIExpression(
      op(
        'and',
        op('gte', variable('SCORE'), baseValue('integer', 60)),
        op('lt', variable('ATTEMPTS'), baseValue('integer', 3)),
      ),
      variables,
    );

    expect(evaluator()).toBe(true);
    variables.ATTEMPTS = 5;
    expect(evaluator()).toBe(false);
    variables.ATTEMPTS = 2;
    variables.SCORE = 45;
    expect(evaluator()).toBe(false);
  });
});

describe('validateExpressionNode direct tests', () => {
  it('should throw error for undeclared variable', () => {
    const doc = parseXML('<qti-variable identifier="UNDECLARED" />');
    expect(() => {
      validateExpressionNode(doc.documentElement, {});
    }).toThrow(TypeError);
    expect(() => {
      validateExpressionNode(doc.documentElement, {});
    }).toThrow("Variable 'UNDECLARED' is not declared");
  });

  it('should not throw for declared variable', () => {
    const doc = parseXML('<qti-variable identifier="DECLARED" />');
    const declarations = { DECLARED: { baseType: 'integer', cardinality: 'single' } };
    expect(() => {
      validateExpressionNode(doc.documentElement, declarations);
    }).not.toThrow();
  });

  it('should throw error for type mismatch in equal expression', () => {
    const doc = parseXML(op('equal', variable('INT_VAR'), variable('STR_VAR')));
    const declarations = {
      INT_VAR: { baseType: 'integer', cardinality: 'single' },
      STR_VAR: { baseType: 'string', cardinality: 'single' },
    };
    expect(() => {
      validateExpressionNode(doc.documentElement, declarations);
    }).toThrow(TypeError);
    expect(() => {
      validateExpressionNode(doc.documentElement, declarations);
    }).toThrow('Type mismatch');
  });

  it('should not throw for compatible types in equal expression (int and float)', () => {
    const doc = parseXML(op('equal', variable('INT_VAR'), variable('FLOAT_VAR')));
    const declarations = {
      INT_VAR: { baseType: 'integer', cardinality: 'single' },
      FLOAT_VAR: { baseType: 'float', cardinality: 'single' },
    };
    expect(() => {
      validateExpressionNode(doc.documentElement, declarations);
    }).not.toThrow();
  });

  it('should validate nested expressions recursively', () => {
    const doc = parseXML(
      op('and', op('gte', variable('SCORE'), baseValue('integer', 60)), variable('UNDECLARED')),
    );
    const declarations = { SCORE: { baseType: 'integer', cardinality: 'single' } };
    expect(() => {
      validateExpressionNode(doc.documentElement, declarations);
    }).toThrow(TypeError);
  });

  it('should handle base-value nodes without throwing', () => {
    const doc = parseXML('<qti-base-value base-type="integer">42</qti-base-value>');
    expect(() => {
      validateExpressionNode(doc.documentElement, {});
    }).not.toThrow();
  });
});

describe('match operator', () => {
  it('should match identical arrays using deep comparison', () => {
    const variables = { A: [1, 2, 3], B: [1, 2, 3] };
    const evaluator = parseQTIExpression(op('match', variable('A'), variable('B')), variables);
    expect(evaluator()).toBe(true);
  });

  it('should not match arrays with different order for ordered cardinality', () => {
    const variables = { A: [1, 2, 3], B: [3, 2, 1] };
    const declarations = {
      A: { baseType: 'integer', cardinality: 'ordered' },
      B: { baseType: 'integer', cardinality: 'ordered' },
    };
    const evaluator = parseQTIExpression(
      op('match', variable('A'), variable('B')),
      variables,
      declarations,
    );
    expect(evaluator()).toBe(false);
  });

  it('should match identical objects using deep comparison', () => {
    const variables = { A: { x: 1, y: 2 }, B: { x: 1, y: 2 } };
    const evaluator = parseQTIExpression(op('match', variable('A'), variable('B')), variables);
    expect(evaluator()).toBe(true);
  });

  it('should match primitive values', () => {
    const evaluator = parseQTIExpression(
      op('match', baseValue('integer', 42), baseValue('integer', 42)),
      {},
    );
    expect(evaluator()).toBe(true);
  });
});

describe('match with compound expressions', () => {
  it('should match when both children are compound expressions wrapping variables', () => {
    // When qti-match children are compound expressions (e.g., qti-multiple wrapping
    // qti-variable), inferBaseType cannot determine the type from direct children.
    // The match should still work via generic equality.
    const { declarations, variables, exprNode } = assessmentExpr(
      [
        responseDecl('A', 'identifier', 'multiple', correctResponse('X', 'Y')),
        outcomeDecl('RESULT', 'boolean'),
      ],
      op(
        'match',
        variable('A'),
        op('multiple', baseValue('identifier', 'Y'), baseValue('identifier', 'X')),
      ),
    );
    variables.A = ['X', 'Y'];
    // Multiple cardinality: bag equality — order doesn't matter
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
  });

  it('should use unordered pair comparison when both children are compound expressions', () => {
    // When BOTH children of qti-match are compound expressions (qti-multiple),
    // inferBaseType must recurse into them to discover the pair base type so
    // that (A,B) is treated as equal to (B,A).
    const { declarations, variables, exprNode } = assessmentExpr(
      outcomeDecl('RESULT', 'boolean'),
      op(
        'match',
        op('multiple', baseValue('pair', 'A B'), baseValue('pair', 'C D')),
        op('multiple', baseValue('pair', 'B A'), baseValue('pair', 'D C')),
      ),
    );
    // Both sides are qti-multiple of pairs with reversed order.
    // Pairs are unordered: (A,B) === (B,A), and bag equality ignores order.
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
  });

  // qti-match with nested arithmetic children (qti-sum). inferBaseType returns null
  // for these, but the generic equality comparison still works for primitive results.
  // [A, B, expected] — evaluates match(A+1, B+2).
  it.each([
    [5, 4, true], // 6 == 6
    [5, 5, false], // 6 != 7
  ])('match(A+1, B+2) with A=%d, B=%d → %p', (a, b, expected) => {
    const { declarations, variables, exprNode } = assessmentExpr(
      [
        responseDecl('A', 'integer'),
        responseDecl('B', 'integer'),
        outcomeDecl('RESULT', 'boolean'),
      ],
      op(
        'match',
        op('sum', variable('A'), baseValue('integer', 1)),
        op('sum', variable('B'), baseValue('integer', 2)),
      ),
    );
    variables.A = a;
    variables.B = b;
    expect(evaluateNode(exprNode, variables, declarations)).toBe(expected);
  });
});

describe('test-variables operator', () => {
  // Build an item with a SCORE outcome (integer, single) by default.
  // Pass { outcome, baseType, cardinality, section, category, weights } to override.
  function item(id, opts = {}) {
    const {
      outcome = 0,
      outcomeKey = 'SCORE',
      baseType = 'integer',
      cardinality = 'single',
      section = null,
      category = null,
      weights = {},
    } = opts;
    return {
      identifier: id,
      outcomes: { [outcomeKey]: outcome },
      section,
      category,
      baseTypes: { [outcomeKey]: baseType },
      cardinalities: { [outcomeKey]: cardinality },
      weights,
    };
  }

  // Shape of the testStore passed to evaluateNode as the 4th argument.
  function createTestStore(items) {
    return {
      items: items.reduce((acc, it) => {
        acc[it.identifier] = {
          outcomes: it.outcomes,
          section: it.section || null,
          category: it.category || null,
          baseTypes: it.baseTypes || {},
          cardinalities: it.cardinalities || {},
          weights: it.weights || {},
        };
        return acc;
      }, {}),
    };
  }

  // Run a qti-test-variables XML against a list of items and return the result.
  function runTestVars(xml, items) {
    const doc = parseXML(xml);
    return evaluateNode(doc.documentElement, {}, {}, createTestStore(items));
  }

  // Row shape: [label, variable-identifier, extra XML attrs, items, expected]
  it.each([
    [
      'collects SCORE values from all items',
      'SCORE',
      '',
      [
        item('ITEM1', { outcome: 10 }),
        item('ITEM2', { outcome: 8 }),
        item('ITEM3', { outcome: 12 }),
      ],
      [10, 8, 12],
    ],
    [
      'ignores items without the specified variable',
      'SCORE',
      '',
      [
        item('ITEM1', { outcome: 10 }),
        item('ITEM2', { outcome: 5, outcomeKey: 'OTHER' }),
        item('ITEM3', { outcome: 12 }),
      ],
      [10, 12],
    ],
    [
      'ignores null values',
      'SCORE',
      '',
      [
        item('ITEM1', { outcome: 10 }),
        item('ITEM2', { outcome: null }),
        item('ITEM3', { outcome: 12 }),
      ],
      [10, 12],
    ],
    [
      'only includes single cardinality variables',
      'SCORE',
      '',
      [
        item('ITEM1', { outcome: 10 }),
        item('ITEM2', { outcome: [5, 6], cardinality: 'multiple' }),
        item('ITEM3', { outcome: 12 }),
      ],
      [10, 12],
    ],
    [
      'filters by section-identifier',
      'SCORE',
      'section-identifier="section1"',
      [
        item('ITEM1', { outcome: 10, section: 'section1' }),
        item('ITEM2', { outcome: 8, section: 'section2' }),
        item('ITEM3', { outcome: 12, section: 'section1' }),
      ],
      [10, 12],
    ],
    [
      'filters by include-category',
      'SCORE',
      'include-category="math"',
      [
        item('ITEM1', { outcome: 10, category: 'math' }),
        item('ITEM2', { outcome: 8, category: 'english' }),
        item('ITEM3', { outcome: 12, category: 'math' }),
      ],
      [10, 12],
    ],
    [
      'filters by exclude-category',
      'SCORE',
      'exclude-category="math"',
      [
        item('ITEM1', { outcome: 10, category: 'math' }),
        item('ITEM2', { outcome: 8, category: 'english' }),
        item('ITEM3', { outcome: 12, category: 'math' }),
      ],
      [8],
    ],
    [
      'combines include-category and exclude-category',
      'SCORE',
      'include-category="math" exclude-category="science"',
      [
        item('ITEM1', { outcome: 10, category: 'math science' }),
        item('ITEM2', { outcome: 8, category: 'english' }),
        item('ITEM3', { outcome: 12, category: 'math' }),
      ],
      [12],
    ],
    [
      'filters by base-type integer',
      'SCORE',
      'base-type="integer"',
      [
        item('ITEM1', { outcome: 10 }),
        item('ITEM2', { outcome: 8.5, baseType: 'float' }),
        item('ITEM3', { outcome: 12 }),
      ],
      [10, 12],
    ],
    [
      'filters by base-type float',
      'SCORE',
      'base-type="float"',
      [
        item('ITEM1', { outcome: 10 }),
        item('ITEM2', { outcome: 8.5, baseType: 'float' }),
        item('ITEM3', { outcome: 12.0, baseType: 'float' }),
      ],
      [8.5, 12.0],
    ],
    [
      'includes both integer and float when base-type not specified',
      'SCORE',
      '',
      [
        item('ITEM1', { outcome: 10 }),
        item('ITEM2', { outcome: 8.5, baseType: 'float' }),
        item('ITEM3', { outcome: 'text', baseType: 'string' }),
      ],
      [10, 8.5],
    ],
    [
      'supports dotted variable-identifier for specific item',
      'ITEM2.SCORE',
      '',
      [
        item('ITEM1', { outcome: 10 }),
        item('ITEM2', { outcome: 8 }),
        item('ITEM3', { outcome: 12 }),
      ],
      [8],
    ],
    [
      'returns empty array when no items match',
      'SCORE',
      '',
      [item('ITEM1', { outcome: 10, outcomeKey: 'OTHER' })],
      [],
    ],
  ])('should %s', (_label, variable, attrs, items, expected) => {
    const xml = `<qti-test-variables variable-identifier="${variable}" ${attrs} />`;
    expect(runTestVars(xml, items)).toEqual(expected);
  });

  it('should return empty array when testStore is not provided', () => {
    const doc = parseXML('<qti-test-variables variable-identifier="SCORE" />');
    const result = evaluateNode(doc.documentElement, {}, {});
    expect(result).toEqual([]);
  });

  it('should work with sum to aggregate test scores', () => {
    const doc = parseXML(`
      <qti-sum>
        <qti-test-variables variable-identifier="SCORE" />
      </qti-sum>
    `);
    const testStore = createTestStore([
      item('ITEM1', { outcome: 10 }),
      item('ITEM2', { outcome: 8 }),
      item('ITEM3', { outcome: 12 }),
    ]);
    expect(evaluateNode(doc.documentElement, {}, {}, testStore)).toBe(30);
  });

  it('should apply weight-identifier to values', () => {
    const result = runTestVars(
      '<qti-test-variables variable-identifier="SCORE" weight-identifier="default" />',
      [
        item('ITEM1', { outcome: 10, weights: { default: 2.0 } }),
        item('ITEM2', { outcome: 8, weights: { default: 1.5 } }),
        item('ITEM3', { outcome: 12, weights: { default: 1.0 } }),
      ],
    );
    // 10*2.0=20, 8*1.5=12, 12*1.0=12
    expect(result).toEqual([20, 12, 12]);
  });

  it('should use weight of 1.0 when weight-identifier not found on item', () => {
    const result = runTestVars(
      '<qti-test-variables variable-identifier="SCORE" weight-identifier="default" />',
      [
        item('ITEM1', { outcome: 10, weights: { default: 2.0 } }),
        item('ITEM2', { outcome: 8 }), // no weights
      ],
    );
    // 10*2.0=20, 8*1.0=8 (default weight when not found)
    expect(result).toEqual([20, 8]);
  });

  it('should convert result to float when weight-identifier is used', () => {
    const result = runTestVars(
      '<qti-test-variables variable-identifier="SCORE" weight-identifier="w" />',
      [item('ITEM1', { outcome: 10, weights: { w: 1.0 } })],
    );
    // When weight is used, result should be float (10 * 1.0 = 10.0)
    expect(result).toEqual([10]);
    expect(typeof result[0]).toBe('number');
  });

  // Space-separated include/exclude-category matches items with ANY of the
  // listed categories (not all).
  it.each([
    ['include-category', 'include-category="math science"', [10, 8]],
    ['exclude-category', 'exclude-category="math science"', [12]],
  ])('should filter by multi-value %s (space-separated)', (_label, attrs, expected) => {
    const xml = `<qti-test-variables variable-identifier="SCORE" ${attrs} />`;
    const items = [
      item('ITEM1', { outcome: 10, category: 'math' }),
      item('ITEM2', { outcome: 8, category: 'science' }),
      item('ITEM3', { outcome: 12, category: 'history' }),
    ];
    expect(runTestVars(xml, items)).toEqual(expected);
  });

  it('should flatten test-variables inside qti-multiple', () => {
    // qti-test-variables produces an array (multiple cardinality container).
    // When used as a child of qti-multiple, the array should be flattened
    // into the result rather than added as a nested array.
    const testStore = createTestStore([
      item('ITEM1', { outcome: 5 }),
      item('ITEM2', { outcome: 3 }),
    ]);
    const doc = parseXML(
      op(
        'multiple',
        op('test-variables', { 'variable-identifier': 'SCORE' }),
        baseValue('integer', 99),
      ),
    );
    // Should be [5, 3, 99] (flattened), not [[5, 3], 99]
    expect(evaluateNode(doc.documentElement, {}, {}, testStore)).toEqual([5, 3, 99]);
  });
});

describe('match with multiple cardinality (bag equality)', () => {
  const matchResponseCorrect = op(
    'match',
    variable('RESPONSE'),
    op('correct', { identifier: 'RESPONSE' }),
  );

  it('should treat multiple cardinality as unordered bag — [A,B] matches [B,A]', () => {
    const variables = { RESPONSE: ['B', 'A'] };
    const declarations = {
      RESPONSE: {
        correctResponse: ['A', 'B'],
        baseType: 'identifier',
        cardinality: 'multiple',
      },
    };
    const evaluator = parseQTIExpression(matchResponseCorrect, variables, declarations);
    expect(evaluator()).toBe(true);
  });

  it('should return false for multiple cardinality when values differ', () => {
    const variables = { RESPONSE: ['A', 'C'] };
    const declarations = {
      RESPONSE: {
        correctResponse: ['A', 'B'],
        baseType: 'identifier',
        cardinality: 'multiple',
      },
    };
    const evaluator = parseQTIExpression(matchResponseCorrect, variables, declarations);
    expect(evaluator()).toBe(false);
  });

  it('should handle duplicates in multiple cardinality — [A,A,B] matches [A,B,A]', () => {
    const variables = { A: ['A', 'A', 'B'], B: ['A', 'B', 'A'] };
    const evaluator = parseQTIExpression(op('match', variable('A'), variable('B')), variables);
    expect(evaluator()).toBe(true);
  });

  it('should return false when duplicate counts differ — [A,A,B] vs [A,B,B]', () => {
    const variables = { A: ['A', 'A', 'B'], B: ['A', 'B', 'B'] };
    const evaluator = parseQTIExpression(op('match', variable('A'), variable('B')), variables);
    expect(evaluator()).toBe(false);
  });

  it('should still use positional equality for ordered cardinality', () => {
    const variables = { A: ['A', 'B'], B: ['B', 'A'] };
    const declarations = {
      A: { baseType: 'identifier', cardinality: 'ordered' },
      B: { baseType: 'identifier', cardinality: 'ordered' },
    };
    const evaluator = parseQTIExpression(
      op('match', variable('A'), variable('B')),
      variables,
      declarations,
    );
    // Ordered cardinality — order matters, so these are NOT equal
    expect(evaluator()).toBe(false);
  });
});

describe('contains as subset test (multiset semantics)', () => {
  it('should return true when container contains all values of sub-container', () => {
    const variables = {
      CONTAINER: ['A', 'B', 'C', 'D'],
      SUB: ['B', 'C'],
    };
    const evaluator = parseQTIExpression(
      op('contains', variable('CONTAINER'), variable('SUB')),
      variables,
    );
    expect(evaluator()).toBe(true);
  });

  it('should return false when container is missing a value from sub-container', () => {
    const variables = {
      CONTAINER: ['A', 'B'],
      SUB: ['B', 'C'],
    };
    const evaluator = parseQTIExpression(
      op('contains', variable('CONTAINER'), variable('SUB')),
      variables,
    );
    expect(evaluator()).toBe(false);
  });

  it('should handle duplicate values in sub-container (multiset semantics)', () => {
    const variables = {
      CONTAINER: ['A', 'B', 'C'],
      SUB: ['A', 'A'],
    };
    const evaluator = parseQTIExpression(
      op('contains', variable('CONTAINER'), variable('SUB')),
      variables,
    );
    // Container has only one A, sub requires two
    expect(evaluator()).toBe(false);
  });
});

describe('substring case-sensitive attribute', () => {
  it('should be case-sensitive by default', () => {
    const evaluator = parseQTIExpression(
      op('substring', baseValue('string', 'Hello'), baseValue('string', 'hello world')),
      {},
    );
    expect(evaluator()).toBe(false);
  });

  it('should support case-insensitive matching', () => {
    const evaluator = parseQTIExpression(
      op(
        'substring',
        { 'case-sensitive': 'false' },
        baseValue('string', 'Hello'),
        baseValue('string', 'hello world'),
      ),
      {},
    );
    expect(evaluator()).toBe(true);
  });

  it('should handle case-sensitive=true explicitly', () => {
    const evaluator = parseQTIExpression(
      op(
        'substring',
        { 'case-sensitive': 'true' },
        baseValue('string', 'Hello'),
        baseValue('string', 'hello world'),
      ),
      {},
    );
    expect(evaluator()).toBe(false);
  });
});

// Non-null gcd/lcm success paths are covered above in 'math operators - extended';
// null-propagation for gcd/lcm is covered by the tabulated
// 'null propagation across operators' describe above.

describe('gcd/lcm should flatten containers', () => {
  it('gcd should flatten a multiple-cardinality container sub-expression', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('NUMS', 'integer', 'multiple'),
      op('gcd', variable('NUMS')),
    );
    variables.NUMS = [12, 18, 24];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(6);
  });

  it('lcm should flatten a multiple-cardinality container sub-expression', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('NUMS', 'integer', 'multiple'),
      op('lcm', variable('NUMS')),
    );
    variables.NUMS = [4, 6];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(12);
  });
});

describe('repeat evaluates all children', () => {
  it('should evaluate all children in each iteration', () => {
    const evaluator = parseQTIExpression(
      op(
        'repeat',
        { 'number-of-iterations': '2' },
        baseValue('integer', 1),
        baseValue('integer', 2),
      ),
      {},
    );
    // 2 iterations × 2 children = 4 values: [1, 2, 1, 2]
    expect(evaluator()).toEqual([1, 2, 1, 2]);
  });
});

describe('product flattens containers', () => {
  it('should flatten container values before multiplying', () => {
    const variables = { SCORES: [2, 3], FACTOR: 4 };
    const evaluator = parseQTIExpression(
      op('product', variable('SCORES'), variable('FACTOR')),
      variables,
    );
    // [2, 3] flattened with 4 → 2 * 3 * 4 = 24
    expect(evaluator()).toBe(24);
  });

  it('should flatten a single container in product', () => {
    const variables = { VALUES: [2, 5, 3] };
    const evaluator = parseQTIExpression(op('product', variable('VALUES')), variables);
    expect(evaluator()).toBe(30);
  });
});

describe('min/max flatten containers', () => {
  it('min should flatten container values', () => {
    const variables = { VALUES: [5, 3, 7] };
    const evaluator = parseQTIExpression(op('min', variable('VALUES')), variables);
    expect(evaluator()).toBe(3);
  });

  it('max should flatten container values', () => {
    const variables = { VALUES: [5, 3, 7] };
    const evaluator = parseQTIExpression(op('max', variable('VALUES')), variables);
    expect(evaluator()).toBe(7);
  });

  it('min should flatten mixed containers and scalars', () => {
    const variables = { VALUES: [5, 3], EXTRA: 1 };
    const evaluator = parseQTIExpression(
      op('min', variable('VALUES'), variable('EXTRA')),
      variables,
    );
    expect(evaluator()).toBe(1);
  });

  it('max should flatten mixed containers and scalars', () => {
    const variables = { VALUES: [5, 3], EXTRA: 10 };
    const evaluator = parseQTIExpression(
      op('max', variable('VALUES'), variable('EXTRA')),
      variables,
    );
    expect(evaluator()).toBe(10);
  });
});

describe('random-integer/random-float edge cases', () => {
  // [xml, expected] — attribute-based edge cases for qti-random-integer / qti-random-float.
  // Both min=0/max=0 are valid (only value 0); missing max or step=0 should return null.
  it.each([
    ['<qti-random-integer min="0" max="0" />', 0],
    ['<qti-random-float min="0" max="0" />', 0],
    ['<qti-random-integer min="1" max="10" step="0" />', null],
    ['<qti-random-integer min="1" />', null], // missing max
    ['<qti-random-integer />', null], // missing min and max
    ['<qti-random-float min="0" />', null], // missing max
    ['<qti-random-float />', null], // missing min and max
    ['<qti-random-integer min="10" max="5" />', null], // min > max
    ['<qti-random-float min="10" max="5" />', null], // min > max
  ])('%s → %p', (xml, expected) => {
    expect(parseQTIExpression(xml, {})()).toBe(expected);
  });
});

describe('duration-lt and duration-gte operators', () => {
  // [op, a, b, expected]
  // Null-operand cases are covered in the 'null propagation across operators' table above.
  it.each([
    ['qti-duration-lt', 30.0, 60.0, true], // a < b
    ['qti-duration-lt', 60.0, 30.0, false], // a > b
    ['qti-duration-lt', 30.0, 30.0, false], // equal
    ['qti-duration-gte', 60.0, 30.0, true], // a > b
    ['qti-duration-gte', 30.0, 30.0, true], // equal
    ['qti-duration-gte', 30.0, 60.0, false], // a < b
  ])('%s(%p, %p) → %p', (op, a, b, expected) => {
    const evaluator = parseQTIExpression(
      `<${op}><qti-variable identifier="A" /><qti-variable identifier="B" /></${op}>`,
      { A: a, B: b },
    );
    expect(evaluator()).toBe(expected);
  });
});

describe('isNull with empty arrays', () => {
  // qti-is-null: "empty containers and empty strings are both treated as
  // NULL" — v3 section 2.11.3.34
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpIsNull
  it('should return true for empty array (empty container is null)', () => {
    const variables = { CONTAINER: [] };
    const evaluator = parseQTIExpression(op('is-null', variable('CONTAINER')), variables);
    expect(evaluator()).toBe(true);
  });

  it('should return false for non-empty array', () => {
    const variables = { CONTAINER: ['A'] };
    const evaluator = parseQTIExpression(op('is-null', variable('CONTAINER')), variables);
    expect(evaluator()).toBe(false);
  });
});

describe('pair value equality', () => {
  it('match should treat pair values as unordered: [A,B] equals [B,A]', () => {
    const declarations = {
      P1: { cardinality: 'single', baseType: 'pair' },
      P2: { cardinality: 'single', baseType: 'pair' },
    };
    const variables = {
      P1: ['A', 'B'],
      P2: ['B', 'A'],
    };
    const evaluator = parseQTIExpression(
      op('match', variable('P1'), variable('P2')),
      variables,
      declarations,
    );
    expect(evaluator()).toBe(true);
  });

  it('match should treat directedPair values as ordered: [A,B] !== [B,A]', () => {
    const declarations = {
      P1: { cardinality: 'single', baseType: 'directedPair' },
      P2: { cardinality: 'single', baseType: 'directedPair' },
    };
    const variables = {
      P1: ['A', 'B'],
      P2: ['B', 'A'],
    };
    const evaluator = parseQTIExpression(
      op('match', variable('P1'), variable('P2')),
      variables,
      declarations,
    );
    expect(evaluator()).toBe(false);
  });

  it('member should find pair [B,A] in container that has [A,B]', () => {
    const declarations = {
      PAIR: { cardinality: 'single', baseType: 'pair' },
      PAIRS: { cardinality: 'multiple', baseType: 'pair' },
    };
    const variables = {
      PAIR: ['B', 'A'],
      PAIRS: [
        ['A', 'B'],
        ['C', 'D'],
      ],
    };
    const evaluator = parseQTIExpression(
      op('member', variable('PAIR'), variable('PAIRS')),
      variables,
      declarations,
    );
    expect(evaluator()).toBe(true);
  });
});

describe('match with ordered containers of pair values', () => {
  const matchRespCorrect = op('match', variable('RESP'), op('correct', { identifier: 'RESP' }));

  it('should match ordered containers of pairs using unordered pair semantics per element', () => {
    // Two ordered containers of pairs: each pair element should use unordered comparison.
    // ['A','B'] should equal ['B','A'] since pairs are unordered, but the container
    // order must match (ordered cardinality uses positional equality).
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESP', 'pair', 'ordered', correctResponse('A B', 'C D')),
      matchRespCorrect,
    );
    // Response has same pairs but with swapped element order within each pair
    variables.RESP = [
      ['B', 'A'],
      ['D', 'C'],
    ];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
  });

  it('should reject ordered containers of pairs when container order differs', () => {
    // Pairs individually match, but container order is different — ordered cardinality
    // requires positional equality, so this should be false.
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESP', 'pair', 'ordered', correctResponse('A B', 'C D')),
      matchRespCorrect,
    );
    // Response has pairs in reversed container order
    variables.RESP = [
      ['C', 'D'],
      ['A', 'B'],
    ];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(false);
  });

  it('should handle ordered container of exactly 2 pairs without triggering pair shortcut', () => {
    // Regression: a container of exactly 2 pair elements has array length 2,
    // which previously triggered the single-pair shortcut in qtiValuesEqual,
    // comparing container[0] === container[0] by reference instead of element-wise.
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESP', 'pair', 'ordered', correctResponse('A B', 'C D')),
      matchRespCorrect,
    );
    // Exact same pairs, same order — must return true
    variables.RESP = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
  });

  it('should handle ordered container of 3 pairs with unordered element comparison', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESP', 'pair', 'ordered', correctResponse('A B', 'C D', 'E F')),
      matchRespCorrect,
    );
    // Each pair element reversed but container order preserved
    variables.RESP = [
      ['B', 'A'],
      ['D', 'C'],
      ['F', 'E'],
    ];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
  });
});

describe('contains with compound-type sub-containers', () => {
  const containsContainerSub = op('contains', variable('CONTAINER'), variable('SUB'));
  const pairContainerDecls = [
    responseDecl('CONTAINER', 'pair', 'multiple'),
    responseDecl('SUB', 'pair', 'multiple'),
  ];

  it('should test subset containment for containers of pairs', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      pairContainerDecls,
      containsContainerSub,
    );
    variables.CONTAINER = [
      ['A', 'B'],
      ['C', 'D'],
      ['E', 'F'],
    ];
    variables.SUB = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
  });

  it('should return false when sub-container of pairs is not a subset', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      pairContainerDecls,
      containsContainerSub,
    );
    variables.CONTAINER = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    variables.SUB = [
      ['A', 'B'],
      ['X', 'Y'],
    ];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(false);
  });

  it('should treat pairs as unordered in multiset containment — (B,A) found in [(A,B)]', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      pairContainerDecls,
      containsContainerSub,
    );
    variables.CONTAINER = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    variables.SUB = [['B', 'A']];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
  });
});

describe('match cardinality detection for non-direct variable references', () => {
  it('should use positional equality for ordered containers from qti-ordered expressions', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      [responseDecl('A', 'identifier'), responseDecl('B', 'identifier')],
      op(
        'match',
        op('ordered', baseValue('identifier', 'X'), baseValue('identifier', 'Y')),
        op('ordered', baseValue('identifier', 'Y'), baseValue('identifier', 'X')),
      ),
    );
    // [X,Y] vs [Y,X] — ordered cardinality should use positional equality → false
    expect(evaluateNode(exprNode, variables, declarations)).toBe(false);
  });

  it('should warn when cardinality cannot be determined from child expressions', () => {
    // Both children are qti-sum expressions — the evaluator cannot determine
    // cardinality from these tags, so it should log a warning before falling
    // back to bag (multiset) equality.
    const { declarations, variables, exprNode } = assessmentExpr(
      [
        responseDecl(
          'A',
          'integer',
          'multiple',
          `
          <qti-default-value>
            <qti-value>1</qti-value>
            <qti-value>2</qti-value>
          </qti-default-value>`,
        ),
        responseDecl(
          'B',
          'integer',
          'multiple',
          `
          <qti-default-value>
            <qti-value>2</qti-value>
            <qti-value>1</qti-value>
          </qti-default-value>`,
        ),
      ],
      op(
        'match',
        op('delete', variable('A'), baseValue('integer', 999)),
        op('delete', variable('B'), baseValue('integer', 999)),
      ),
    );
    mockWarn.mockClear();
    evaluateNode(exprNode, variables, declarations);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('qti-match'));
  });
});

describe('Pair ordering in match with multiple cardinality (bag equality)', () => {
  it('should match bags of pairs regardless of internal pair order — [(B,A)] equals [(A,B)]', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('RESPONSE', 'pair', 'multiple', correctResponse('A B', 'C D')),
      op('match', variable('RESPONSE'), op('correct', { identifier: 'RESPONSE' })),
    );
    variables.RESPONSE = [
      ['B', 'A'],
      ['D', 'C'],
    ];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
  });
});

describe('Pair ordering in delete', () => {
  it('should delete pairs regardless of internal order — delete (B,A) removes (A,B)', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('PAIRS', 'pair', 'multiple'),
      op('delete', variable('PAIRS'), baseValue('pair', 'B A')),
    );
    variables.PAIRS = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    // (B,A) should match (A,B) since pairs are unordered, leaving only [(C,D)]
    expect(evaluateNode(exprNode, variables, declarations)).toEqual([['C', 'D']]);
  });
});

describe('round-to and equal-rounded with malformed figures attribute', () => {
  beforeEach(() => mockWarn.mockClear());

  // Non-numeric or missing `figures` should warn and return null for both
  // qti-round-to (one operand) and qti-equal-rounded (two operands).
  it.each([
    [
      'round-to non-numeric',
      '<qti-round-to figures="abc" rounding-mode="significantFigures"><qti-base-value base-type="float">3.14</qti-base-value></qti-round-to>',
    ],
    [
      'equal-rounded non-numeric',
      '<qti-equal-rounded figures="xyz" rounding-mode="decimalPlaces"><qti-base-value base-type="float">1.5</qti-base-value><qti-base-value base-type="float">2.5</qti-base-value></qti-equal-rounded>',
    ],
    [
      'round-to missing',
      '<qti-round-to rounding-mode="significantFigures"><qti-base-value base-type="float">3.14</qti-base-value></qti-round-to>',
    ],
    [
      'equal-rounded missing',
      '<qti-equal-rounded rounding-mode="decimalPlaces"><qti-base-value base-type="float">1.5</qti-base-value><qti-base-value base-type="float">2.5</qti-base-value></qti-equal-rounded>',
    ],
  ])('%s figures → warn + null', (_label, xml) => {
    mockWarn.mockClear();
    expect(parseQTIExpression(xml, {})()).toBe(null);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('figures'));
  });
});

describe('multiple/ordered with base-value pair sub-expressions', () => {
  it('should treat base-value pair as a single element in qti-multiple, not flatten', () => {
    const evaluator = parseQTIExpression(
      op('multiple', baseValue('pair', 'A B'), baseValue('pair', 'C D')),
      {},
    );
    // Each base-value pair is a single compound value [A, B] — should be two elements
    expect(evaluator()).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
  });

  it('should treat base-value point as a single element in qti-ordered, not flatten', () => {
    const evaluator = parseQTIExpression(
      op('ordered', baseValue('point', '10 20'), baseValue('point', '30 40')),
      {},
    );
    expect(evaluator()).toEqual([
      [10, 20],
      [30, 40],
    ]);
  });

  it('should treat base-value directedPair as a single element in qti-multiple', () => {
    const evaluator = parseQTIExpression(
      op('multiple', baseValue('directedPair', 'X Y'), baseValue('directedPair', 'Y X')),
      {},
    );
    expect(evaluator()).toEqual([
      ['X', 'Y'],
      ['Y', 'X'],
    ]);
  });

  it('should flatten qti-repeat results in qti-ordered as container values', () => {
    const evaluator = parseQTIExpression(
      op(
        'ordered',
        baseValue('identifier', 'A'),
        op('repeat', { 'number-of-iterations': '2' }, baseValue('identifier', 'B')),
      ),
      {},
    );
    // repeat returns a container [B, B]; ordered should flatten it
    expect(evaluator()).toEqual(['A', 'B', 'B']);
  });
});

describe('multiple/ordered should not flatten compound single values from expression children', () => {
  it('should keep qti-index result as single pair element inside qti-ordered', () => {
    // qti-index extracts a single pair from an ordered container of pairs.
    // The result is an array [A, B] but has single cardinality — it must NOT
    // be flattened into two separate elements.
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl(
        'PAIRS',
        'pair',
        'ordered',
        `
          <qti-default-value>
            <qti-value>A B</qti-value>
            <qti-value>C D</qti-value>
            <qti-value>E F</qti-value>
          </qti-default-value>`,
      ),
      op(
        'ordered',
        op('index', { n: '1' }, variable('PAIRS')),
        op('index', { n: '3' }, variable('PAIRS')),
      ),
    );
    // PAIRS defaults to [['A','B'], ['C','D'], ['E','F']]
    // index(1) = ['A','B'], index(3) = ['E','F']
    // Result should be two pair elements, NOT four strings
    expect(evaluateNode(exprNode, variables, declarations)).toEqual([
      ['A', 'B'],
      ['E', 'F'],
    ]);
  });

  it('should keep qti-field-value result as single point inside qti-multiple', () => {
    // qti-field-value extracts a single field from a record.
    // If the field is a point [x, y], it should be kept as one element.
    const variables = {
      RECORD: { position: [10, 20], label: 'test' },
    };
    const declarations = {
      RECORD: {
        cardinality: 'record',
        baseType: null,
        fieldDeclarations: {
          position: { baseType: 'point', cardinality: 'single' },
          label: { baseType: 'string', cardinality: 'single' },
        },
      },
    };
    const doc = parseXML(
      op(
        'multiple',
        op('field-value', { 'field-identifier': 'position' }, variable('RECORD')),
        baseValue('point', '30 40'),
      ),
    );
    // field-value returns [10,20] (a single point). Should be one element, not flattened.
    const result = evaluateNode(doc.documentElement, variables, declarations);
    expect(result).toEqual([
      [10, 20],
      [30, 40],
    ]);
  });
});

describe('contains cardinality detection for expression-generated containers', () => {
  beforeEach(() => {
    mockWarn.mockClear();
  });

  it('should recognize qti-delete as a container and perform multiset containment', () => {
    // qti-delete returns a container — contains should treat it as a sub-container
    // for multiset containment, not as a single compound value.
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('CONTAINER', 'identifier', 'multiple'),
      op(
        'contains',
        variable('CONTAINER'),
        op('delete', variable('CONTAINER'), baseValue('identifier', 'C')),
      ),
    );
    variables.CONTAINER = ['A', 'B', 'C'];
    // delete removes C from [A,B,C] → [A,B]; container [A,B,C] contains [A,B] → true
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('should recognize qti-repeat as a container and perform multiset containment', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('CONTAINER', 'identifier', 'multiple'),
      op(
        'contains',
        variable('CONTAINER'),
        op('repeat', { 'number-of-iterations': '1' }, baseValue('identifier', 'A')),
      ),
    );
    variables.CONTAINER = ['A', 'B', 'C'];
    // repeat produces [A]; container [A,B,C] contains [A] → true
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('should recognize qti-multiple as a container expression', () => {
    const { declarations, variables, exprNode } = assessmentExpr(
      responseDecl('CONTAINER', 'identifier', 'multiple'),
      op(
        'contains',
        variable('CONTAINER'),
        op('multiple', baseValue('identifier', 'A'), baseValue('identifier', 'B')),
      ),
    );
    variables.CONTAINER = ['A', 'B', 'C'];
    expect(evaluateNode(exprNode, variables, declarations)).toBe(true);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});

describe('unrecognized expression type', () => {
  beforeEach(() => mockWarn.mockClear());

  it('should warn when encountering an unrecognized QTI expression element', () => {
    const doc = parseXML('<qti-unknown-operator />');
    const result = evaluateNode(doc.documentElement, {}, {});
    expect(result).toBe(null);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('unknown-operator'));
  });

  it('should warn for custom-operator which is not implemented', () => {
    const doc = parseXML(
      '<qti-custom-operator class="com.example.MyOp"><qti-base-value base-type="integer">1</qti-base-value></qti-custom-operator>',
    );
    const result = evaluateNode(doc.documentElement, {}, {});
    expect(result).toBe(null);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('custom-operator'));
  });
});
