import {
  normalizeNumerals,
  normalizeUserInput,
  getLocalizedDigits,
  localizeNumerals,
  localizeUserInput,
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

describe('getLocalizedDigits', () => {
  it('returns null for English locale', () => {
    expect(getLocalizedDigits('en')).toBeNull();
  });

  it('returns null for null/undefined locale', () => {
    expect(getLocalizedDigits(null)).toBeNull();
    expect(getLocalizedDigits(undefined)).toBeNull();
  });

  it('returns localized digits for Arabic locale', () => {
    const digits = getLocalizedDigits('ar-EG');
    // ar-EG uses Eastern Arabic numerals
    if (digits) {
      expect(digits).toHaveLength(10);
      expect(digits[0]).toBe('٠');
      expect(digits[1]).toBe('١');
      expect(digits[9]).toBe('٩');
    }
  });

  it('returns null for locales whose digits match ASCII', () => {
    // French, German, Spanish all use the same digits as ASCII
    expect(getLocalizedDigits('fr')).toBeNull();
    expect(getLocalizedDigits('de')).toBeNull();
    expect(getLocalizedDigits('es')).toBeNull();
  });
});

describe('localizeNumerals', () => {
  it('converts ASCII digits to Eastern Arabic for ar-EG', () => {
    expect(localizeNumerals('42', 'ar-EG')).toBe('٤٢');
  });

  it('converts all 10 digits for Arabic locale', () => {
    expect(localizeNumerals('0123456789', 'ar-EG')).toBe('٠١٢٣٤٥٦٧٨٩');
  });

  it('leaves non-digit characters unchanged', () => {
    expect(localizeNumerals('x+y', 'ar-EG')).toBe('x+y');
  });

  it('handles mixed digits and text', () => {
    expect(localizeNumerals('2x+3', 'ar-EG')).toBe('٢x+٣');
  });

  it('handles decimal numbers', () => {
    expect(localizeNumerals('3.14', 'ar-EG')).toBe('٣.١٤');
  });

  it('returns string unchanged for English locale', () => {
    expect(localizeNumerals('42', 'en')).toBe('42');
  });

  it('returns string unchanged for null locale', () => {
    expect(localizeNumerals('42', null)).toBe('42');
  });

  it('returns non-string values unchanged', () => {
    expect(localizeNumerals(42, 'ar-EG')).toBe(42);
    expect(localizeNumerals(null, 'ar-EG')).toBe(null);
    expect(localizeNumerals(undefined, 'ar-EG')).toBe(undefined);
  });

  it('returns empty string unchanged', () => {
    expect(localizeNumerals('', 'ar-EG')).toBe('');
  });
});

describe('localizeUserInput', () => {
  it('localizes numeric-input widget state', () => {
    const input = {
      'numeric-input 1': { currentValue: '42' },
    };
    expect(localizeUserInput(input, 'ar-EG')).toEqual({
      'numeric-input 1': { currentValue: '٤٢' },
    });
  });

  it('localizes expression widget state (plain string)', () => {
    const input = {
      'expression 1': '2x+3',
    };
    expect(localizeUserInput(input, 'ar-EG')).toEqual({
      'expression 1': '٢x+٣',
    });
  });

  it('leaves dropdown widget state unchanged (numeric value)', () => {
    const input = {
      'dropdown 1': { value: 2 },
    };
    expect(localizeUserInput(input, 'ar-EG')).toEqual({
      'dropdown 1': { value: 2 },
    });
  });

  it('handles multiple widgets', () => {
    const input = {
      'numeric-input 1': { currentValue: '21' },
      'numeric-input 2': { currentValue: '7' },
      'expression 1': '5x',
    };
    expect(localizeUserInput(input, 'ar-EG')).toEqual({
      'numeric-input 1': { currentValue: '٢١' },
      'numeric-input 2': { currentValue: '٧' },
      'expression 1': '٥x',
    });
  });

  it('returns input unchanged for English locale', () => {
    const input = { 'numeric-input 1': { currentValue: '42' } };
    expect(localizeUserInput(input, 'en')).toEqual(input);
  });

  it('handles null and undefined gracefully', () => {
    expect(localizeUserInput(null, 'ar-EG')).toBe(null);
    expect(localizeUserInput(undefined, 'ar-EG')).toBe(undefined);
  });

  it('handles nested arrays', () => {
    const input = ['4', ['2', '3']];
    expect(localizeUserInput(input, 'ar-EG')).toEqual(['٤', ['٢', '٣']]);
  });

  it('is the inverse of normalizeUserInput for Arabic', () => {
    const original = {
      'numeric-input 1': { currentValue: '42' },
      'expression 1': '2x+3',
    };
    const localized = localizeUserInput(original, 'ar-EG');
    expect(normalizeUserInput(localized)).toEqual(original);
  });
});
