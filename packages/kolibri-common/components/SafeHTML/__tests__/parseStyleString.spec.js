import parseStyleString from '../parseStyleString';

describe('parseStyleString', () => {
  it('parses a single declaration into a style object', () => {
    expect(parseStyleString('text-align: center')).toEqual({ 'text-align': 'center' });
  });

  it('parses a multi-property declaration into every key', () => {
    const result = parseStyleString('text-align: right; color: blue');
    expect(result['text-align']).toBe('right');
    expect(result.color).toBeTruthy();
  });

  it('returns an empty object for an empty string', () => {
    expect(parseStyleString('')).toEqual({});
  });

  it('returns an empty object for undefined', () => {
    expect(parseStyleString(undefined)).toEqual({});
  });
});
