/**
 * Unit tests for LookupTable declaration strategy.
 * Verifies that qti-interpolation-table and qti-match-table elements
 * are parsed and the lookup capability is registered on the parent variable.
 */
import LookupTable from '../../declarations/lookupTable';
import { outcomeDecl } from '../qtiXmlHelpers';
import { createMockVariable } from './testSetup';

jest.mock('../../evaluator.js', () => ({
  evaluateNode: jest.fn(),
}));

// lookupTable.js pulls in evaluator.js lazily via require(); mirror that here with
// requireMock so the spec needs no static import of it.
const { evaluateNode } = jest.requireMock('../../evaluator.js');

/**
 * Build an outcome declaration with a lookup table, parse it, and attach the
 * LookupTable strategy. Returns the constructed QTIVariable.
 * @param {object} opts - Lookup build options
 * @param {string} opts.tableType - 'interpolation-table' or 'match-table'
 * @param {string} [opts.tableAttrs] - attributes on the table element
 * @param {string} opts.entries - inner entry XML
 * @param {string} [opts.baseType='integer'] - QTI base type of the outcome
 * @param {string} [opts.id='SCORE'] - identifier of the outcome declaration
 * @returns {object} the QTIVariable
 */
function buildLookup({ tableType, tableAttrs = '', entries, baseType = 'integer', id = 'SCORE' }) {
  const tableXml = `<qti-${tableType} ${tableAttrs}>${entries}</qti-${tableType}>`;
  const { variable, doc } = createMockVariable(outcomeDecl(id, baseType, 'single', tableXml));
  const tableNode = doc.querySelector(`qti-${tableType}`);
  new LookupTable(tableNode, variable);
  return variable;
}

describe('LookupTable', () => {
  describe('interpolation table', () => {
    // Common entries used across the first four tests — the "default-value"
    // attribute varies by test case but the entries are the same.
    const gradingEntries = `
      <qti-interpolation-table-entry source-value="50" target-value="0" />
      <qti-interpolation-table-entry source-value="70" target-value="1" />
      <qti-interpolation-table-entry source-value="90" target-value="2" />`;

    it('should lookup a value that falls between thresholds', () => {
      const variable = buildLookup({
        tableType: 'interpolation-table',
        tableAttrs: 'default-value="-1"',
        entries: gradingEntries,
      });
      expect(variable.lookup(75)).toBe(2);
    });

    it('should return first target when value is below all thresholds', () => {
      const variable = buildLookup({
        tableType: 'interpolation-table',
        tableAttrs: 'default-value="-1"',
        entries: gradingEntries,
      });
      expect(variable.lookup(40)).toBe(0);
    });

    it('should return default when value is above all thresholds', () => {
      const variable = buildLookup({
        tableType: 'interpolation-table',
        tableAttrs: 'default-value="-1"',
        entries: gradingEntries,
      });
      expect(variable.lookup(95)).toBe(-1);
    });

    it('should return default when value is null', () => {
      const variable = buildLookup({
        tableType: 'interpolation-table',
        tableAttrs: 'default-value="-1"',
        entries: gradingEntries,
      });
      expect(variable.lookup(null)).toBe(-1);
    });

    it('should skip boundary value when include-boundary is false', () => {
      const variable = buildLookup({
        tableType: 'interpolation-table',
        tableAttrs: 'default-value="-1"',
        entries: `
          <qti-interpolation-table-entry
            source-value="50" target-value="0"
            include-boundary="false" />
          <qti-interpolation-table-entry source-value="70" target-value="1" />`,
      });
      // Exactly 50 should NOT match the first entry (include-boundary=false),
      // so it falls through to the next entry.
      expect(variable.lookup(50)).toBe(1);
    });

    it('should coerce identifier target values without producing NaN', () => {
      const variable = buildLookup({
        tableType: 'interpolation-table',
        baseType: 'identifier',
        id: 'LEVEL',
        tableAttrs: 'default-value="unknown"',
        entries: `
          <qti-interpolation-table-entry source-value="50" target-value="basic" />
          <qti-interpolation-table-entry source-value="80" target-value="proficient" />`,
      });
      const result = variable.lookup(40);
      expect(result).toBe('basic');
      expect(result).not.toBeNaN();
    });

    it('should follow spec algorithm: value below threshold gets that threshold target (grading scenario)', () => {
      // Grading scenario: thresholds at 50, 70, 90.
      // Score 65: below 70 threshold → gets target for 70 (grade "C")
      // Score 70: equals 70 threshold, include-boundary=true → gets target for 70
      // Score 71: above 70 but below 90 → gets target for 90 (grade "B")
      // Score 95: above all thresholds → default
      const variable = buildLookup({
        tableType: 'interpolation-table',
        baseType: 'identifier',
        id: 'GRADE',
        tableAttrs: 'default-value="A"',
        entries: `
          <qti-interpolation-table-entry source-value="50" target-value="F" />
          <qti-interpolation-table-entry source-value="70" target-value="C" />
          <qti-interpolation-table-entry source-value="90" target-value="B" />`,
      });
      expect(variable.lookup(30)).toBe('F'); // below first threshold
      expect(variable.lookup(50)).toBe('F'); // exactly at first threshold (include-boundary=true)
      expect(variable.lookup(65)).toBe('C'); // between thresholds
      expect(variable.lookup(70)).toBe('C'); // exactly at second threshold
      expect(variable.lookup(85)).toBe('B'); // between thresholds
      expect(variable.lookup(90)).toBe('B'); // exactly at third threshold
      expect(variable.lookup(95)).toBe('A'); // above all thresholds
    });

    it('should handle include-boundary=false: exact boundary value falls through to next entry', () => {
      const variable = buildLookup({
        tableType: 'interpolation-table',
        id: 'LEVEL',
        tableAttrs: 'default-value="3"',
        entries: `
          <qti-interpolation-table-entry source-value="10" target-value="0" include-boundary="false" />
          <qti-interpolation-table-entry source-value="20" target-value="1" />
          <qti-interpolation-table-entry source-value="30" target-value="2" />`,
      });
      expect(variable.lookup(5)).toBe(0); // below first threshold
      expect(variable.lookup(10)).toBe(1); // at first threshold, include-boundary=false → skip
      expect(variable.lookup(15)).toBe(1); // just above first threshold
      expect(variable.lookup(20)).toBe(1); // at second threshold, include-boundary=true
    });
  });

  describe('match table', () => {
    it('should return target for an exact match', () => {
      const variable = buildLookup({
        tableType: 'match-table',
        tableAttrs: 'default-value="0"',
        entries: `
          <qti-match-table-entry source-value="1" target-value="10" />
          <qti-match-table-entry source-value="2" target-value="20" />
          <qti-match-table-entry source-value="3" target-value="30" />`,
      });
      expect(variable.lookup(2)).toBe(20);
    });

    it('should return default when no match is found', () => {
      const variable = buildLookup({
        tableType: 'match-table',
        tableAttrs: 'default-value="0"',
        entries: `
          <qti-match-table-entry source-value="1" target-value="10" />
          <qti-match-table-entry source-value="2" target-value="20" />`,
      });
      expect(variable.lookup(5)).toBe(0);
    });

    it('should return default when value is null', () => {
      const variable = buildLookup({
        tableType: 'match-table',
        tableAttrs: 'default-value="0"',
        entries: `<qti-match-table-entry source-value="1" target-value="10" />`,
      });
      expect(variable.lookup(null)).toBe(0);
    });

    it('should parse source-value as integer per QTI spec, not float', () => {
      // MatchTable "transforms a source integer" — v3 section 5.90
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#Data_MatchTable
      // A non-integer source-value like "3.7" should be truncated to 3.
      const variable = buildLookup({
        tableType: 'match-table',
        tableAttrs: 'default-value="0"',
        entries: `<qti-match-table-entry source-value="3.7" target-value="99" />`,
      });
      expect(variable.lookup(3)).toBe(99); // parseInt("3.7") = 3
      expect(variable.lookup(3.7)).toBe(0); // 3.7 doesn't match int 3
    });
  });

  describe('processRule', () => {
    it('should evaluate child expression and set lookup result on combinedVars', () => {
      const { variable, doc } = createMockVariable(
        outcomeDecl(
          'SCORE',
          'integer',
          'single',
          `<qti-match-table default-value="0">
            <qti-match-table-entry source-value="2" target-value="20" />
          </qti-match-table>`,
        ),
      );
      const tableNode = doc.querySelector('qti-match-table');
      const table = new LookupTable(tableNode, variable);

      const ruleDoc = new DOMParser().parseFromString(
        `<qti-lookup-outcome-value identifier="SCORE"><qti-variable identifier="NUM" /></qti-lookup-outcome-value>`,
        'text/xml',
      );
      const ruleNode = ruleDoc.documentElement;

      evaluateNode.mockReturnValue(2);

      const combinedVars = { SCORE: 0 };
      const declarations = { SCORE: { lookup: value => table.lookup(value) } };

      LookupTable.processRule(ruleNode, combinedVars, declarations);

      expect(evaluateNode).toHaveBeenCalledWith(ruleNode.children[0], combinedVars, declarations);
      expect(combinedVars.SCORE).toBe(20);
    });
  });
});
