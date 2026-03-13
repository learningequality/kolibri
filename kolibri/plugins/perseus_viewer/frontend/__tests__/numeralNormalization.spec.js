import {
  normalizeNumerals,
  normalizeUserInput,
  nonWesternDigitRegex,
} from '../numeralNormalization';

describe('normalizeNumerals', () => {
  it('converts Eastern Arabic digits to ASCII', () => {
    expect(normalizeNumerals('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('converts Extended Arabic-Indic digits to ASCII', () => {
    expect(normalizeNumerals('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('converts Devanagari digits to ASCII', () => {
    expect(normalizeNumerals('०१२३४५६७८९')).toBe('0123456789');
  });

  it('converts Bengali digits to ASCII', () => {
    expect(normalizeNumerals('০১২৩৪৫৬৭৮৯')).toBe('0123456789');
  });

  it('converts Thai digits to ASCII', () => {
    expect(normalizeNumerals('๐๑๒๓๔๕๖๗๘๙')).toBe('0123456789');
  });

  it('converts Myanmar digits to ASCII', () => {
    expect(normalizeNumerals('၀၁၂၃၄၅၆၇၈၉')).toBe('0123456789');
  });

  it('converts Khmer digits to ASCII', () => {
    expect(normalizeNumerals('០១២៣៤៥៦៧៨៩')).toBe('0123456789');
  });

  it('leaves ASCII digits unchanged', () => {
    expect(normalizeNumerals('0123456789')).toBe('0123456789');
  });

  it('leaves non-digit characters unchanged', () => {
    expect(normalizeNumerals('abc + xyz')).toBe('abc + xyz');
  });

  it('handles mixed ASCII and non-Western digits', () => {
    expect(normalizeNumerals('٤2')).toBe('42');
  });

  it('handles expressions with non-Western digits', () => {
    expect(normalizeNumerals('٢x+٣')).toBe('2x+3');
  });

  it('handles decimal numbers with Eastern Arabic digits', () => {
    expect(normalizeNumerals('٣.١٤')).toBe('3.14');
  });

  it('handles fractions with Devanagari digits', () => {
    expect(normalizeNumerals('२१/३')).toBe('21/3');
  });

  it('returns non-string values unchanged', () => {
    expect(normalizeNumerals(42)).toBe(42);
    expect(normalizeNumerals(null)).toBe(null);
    expect(normalizeNumerals(undefined)).toBe(undefined);
    expect(normalizeNumerals(true)).toBe(true);
  });

  it('returns empty string unchanged', () => {
    expect(normalizeNumerals('')).toBe('');
  });

  it('handles negative numbers', () => {
    expect(normalizeNumerals('-٤٢')).toBe('-42');
  });
});

describe('normalizeUserInput', () => {
  it('normalizes numeric-input widget state', () => {
    const input = {
      'numeric-input 1': { currentValue: '٤٢' },
    };
    expect(normalizeUserInput(input)).toEqual({
      'numeric-input 1': { currentValue: '42' },
    });
  });

  it('normalizes expression widget state (plain string)', () => {
    const input = {
      'expression 1': '٢x+٣',
    };
    expect(normalizeUserInput(input)).toEqual({
      'expression 1': '2x+3',
    });
  });

  it('leaves radio widget state unchanged (no digits in choice IDs)', () => {
    const input = {
      'radio 1': { selectedChoiceIds: ['radio-choice-1'] },
    };
    expect(normalizeUserInput(input)).toEqual({
      'radio 1': { selectedChoiceIds: ['radio-choice-1'] },
    });
  });

  it('leaves dropdown widget state unchanged (numeric value)', () => {
    const input = {
      'dropdown 1': { value: 2 },
    };
    expect(normalizeUserInput(input)).toEqual({
      'dropdown 1': { value: 2 },
    });
  });

  it('handles multiple widgets in one input', () => {
    const input = {
      'numeric-input 1': { currentValue: '٢١' },
      'numeric-input 2': { currentValue: '٧' },
      'expression 1': '٥x',
    };
    expect(normalizeUserInput(input)).toEqual({
      'numeric-input 1': { currentValue: '21' },
      'numeric-input 2': { currentValue: '7' },
      'expression 1': '5x',
    });
  });

  it('handles null and undefined gracefully', () => {
    expect(normalizeUserInput(null)).toBe(null);
    expect(normalizeUserInput(undefined)).toBe(undefined);
  });

  it('handles nested arrays', () => {
    const input = ['٤', ['٢', '٣']];
    expect(normalizeUserInput(input)).toEqual(['4', ['2', '3']]);
  });
});

describe('normalizeNumerals selectivity', () => {
  it('normalizes Eastern Arabic digits but not surrounding text', () => {
    expect(normalizeNumerals('٤٢')).toBe('42');
  });

  it('does not modify ASCII digits', () => {
    expect(normalizeNumerals('42')).toBe('42');
  });

  it('does not modify letters', () => {
    expect(normalizeNumerals('abc')).toBe('abc');
  });
});
