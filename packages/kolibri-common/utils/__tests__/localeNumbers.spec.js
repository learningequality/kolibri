import { formatLocaleNumber, getLocaleNumberSymbols, readLocaleNumber } from '../localeNumbers';

describe('readLocaleNumber', () => {
  it('reads French separators', () => {
    [
      ['1,234', '1.234'],
      ['1 234,5', '1234.5'],
      ['-0,5', '-0.5'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'fr')).toBe(value));
  });

  it('reads English separators', () => {
    [
      ['1,234', '1234'],
      ['1,234,567', '1234567'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'en')).toBe(value));
  });

  it('reads Arabic-Indic digits with Latin separators as ASCII digits would read', () => {
    [
      ['٣.٥', 'ar', '3.5'],
      ['٣.٥', 'en', '3.5'],
      ['٣.٥', 'ar-EG', '3.5'],
      ['۳.۵', 'fa', '3.5'],
      ['٣,٥', 'fr', '3.5'],
    ].forEach(([text, language, value]) => expect(readLocaleNumber(text, language)).toBe(value));
  });

  it('reads Arabic separators in Arabic, whose conventions are Latin', () => {
    [
      ['٣٫٥', '3.5'],
      ['١٬٢٣٤٫٥', '1234.5'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'ar')).toBe(value));
  });

  it('reads a comma beside Arabic-Indic digits as the Arabic decimal', () => {
    [
      ['١,٥', 'ar', '1.5'],
      ['٣,٥٠٠', 'ar', '3.5'],
      ['٣،٥', 'ar', '3.5'],
      ['٣,٥', 'en', '3.5'],
      ['١,٥', 'ur', '1.5'],
      ['١,٥', 'ar-EG', '1.5'],
    ].forEach(([text, language, value]) => expect(readLocaleNumber(text, language)).toBe(value));
  });

  it('rejects a comma beside Extended Arabic-Indic digits where the language rejects it', () => {
    [
      ['۳,۵', 'fa'],
      ['۰,۵', 'fa'],
      ['۱,۲۵', 'prs'],
      ['۳,۵', 'ur'],
      ['۳,۵', 'ar'],
    ].forEach(([text, language]) => expect(readLocaleNumber(text, language)).toBeNull());
  });

  it('reads ASCII digits beside Arabic separators as the language digits', () => {
    ['fa', 'ar-EG', 'ps', 'prs', 'pbu', 'ks'].forEach(language =>
      expect(readLocaleNumber('-12٫5', language)).toBe('-12.5'),
    );
  });

  it('reads xsd:double the language cannot read', () => {
    [
      ['1.5', 'fr'],
      ['1.50', 'fr'],
      ['1.5e+3', 'en'],
      ['3.5', 'ar-EG'],
    ].forEach(([text, language]) => expect(readLocaleNumber(text, language)).toBe(text));
    expect(readLocaleNumber('٣.٥', 'fr')).toBe('3.5');
  });

  it('reads a period as grouping where the language groups with it', () => {
    [
      ['1.5', '15'],
      ['1.234', '1234'],
      ['1.234,5', '1234.5'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'de')).toBe(value));
  });

  it('stores what the language reads as the canonical xsd:double', () => {
    [
      ['1,50', '1.5'],
      ['007', '7'],
      ['-0', '0'],
      ['0,0000001', '0.0000001'],
      ['1000000000000000000000', '1000000000000000000000'],
    ].forEach(([text, value]) => expect(readLocaleNumber(text, 'fr')).toBe(value));
  });

  it('reads a leading plus sign', () => {
    [
      ['+1,5', 'fr', '1.5'],
      ['+1,5', 'de', '1.5'],
      ['+1,234', 'en', '1234'],
    ].forEach(([text, language, value]) => expect(readLocaleNumber(text, language)).toBe(value));
  });

  it('rejects text that is not a number', () => {
    ['', '-', '+', '+-1', 'e', '1e', 'one', ',', '1,2,3', '1e400', '0x10', 'Infinity'].forEach(
      text => expect(readLocaleNumber(text, 'fr')).toBeNull(),
    );
  });

  it('reads only xsd:double without a language', () => {
    expect(readLocaleNumber('1.5', '')).toBe('1.5');
    expect(readLocaleNumber('1e+21', undefined)).toBe('1e+21');
    expect(readLocaleNumber('٣٠', '')).toBe('30');
    ['1,5', '1,234', '-'].forEach(text => expect(readLocaleNumber(text, '')).toBeNull());
  });
});

describe('formatLocaleNumber', () => {
  it('formats the number, not the stored form', () => {
    expect(formatLocaleNumber('1.50', 'fr')).toBe('1,5');
    expect(formatLocaleNumber('0012', 'en')).toBe('12');
  });

  it('writes the minus without bidi marks, which would move it right in an ltr field', () => {
    expect(formatLocaleNumber('-0.5', 'ar-EG')).toBe('-٠٫٥');
    expect(formatLocaleNumber('-0.5', 'ckb')).toBe('-٠٫٥');
    expect(formatLocaleNumber('-0.5', 'fa')).toBe('−۰٫۵');
  });

  it('returns the value unchanged without a language', () => {
    expect(formatLocaleNumber('1234.5', '')).toBe('1234.5');
  });

  it('leaves a stored value that is not an xsd:double unchanged', () => {
    expect(formatLocaleNumber('1.2.3', 'ar-EG')).toBe('1.2.3');
    expect(formatLocaleNumber('1 234', 'fa')).toBe('1 234');
  });

  it('leaves a value with an exponent unchanged', () => {
    [
      ['6.022e23', 'en'],
      ['3e8', 'ar-EG'],
      ['1e-50', 'fr'],
      ['1E300', 'de'],
    ].forEach(([value, language]) => expect(formatLocaleNumber(value, language)).toBe(value));
  });

  it('reads back every canonical stored value unchanged in every language', () => {
    ['en', 'fr', 'de', 'hi', 'ar', 'ar-EG', 'fa', 'ckb', 'sd'].forEach(language =>
      ['0', '-0.5', '1234.5', '1e+21', '1e-7', '1e-25', '0.30000000000000004'].forEach(value =>
        expect(readLocaleNumber(formatLocaleNumber(value, language), language)).toBe(value),
      ),
    );
  });
});

describe('getLocaleNumberSymbols', () => {
  it("uses Sindhi's Arabic-Indic digits beside its period decimal", () => {
    expect(getLocaleNumberSymbols('sd')).toEqual({
      digits: ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
      decimal: '.',
    });
  });
});
