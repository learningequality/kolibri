import { deriveHoverColor, resolveTheme, THEMES } from '../EpubConstants';

function channelSum(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].reduce((sum, start) => sum + parseInt(value.slice(start, start + 2), 16), 0);
}

describe('deriveHoverColor', () => {
  it('returns a valid 6-digit hex color', () => {
    expect(deriveHoverColor('#3366cc')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('darkens a light background', () => {
    const hover = deriveHoverColor('#ffffff');
    expect(hover).not.toBe('#ffffff');
    expect(channelSum(hover)).toBeLessThan(channelSum('#ffffff'));
  });

  it('lightens a dark background', () => {
    const hover = deriveHoverColor('#000000');
    expect(hover).not.toBe('#000000');
    expect(channelSum(hover)).toBeGreaterThan(channelSum('#000000'));
  });

  it('accepts shorthand hex notation', () => {
    expect(deriveHoverColor('#fff')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('resolveTheme', () => {
  it('resolves a fixed theme by id to the canonical theme', () => {
    // A persisted snapshot may carry stale colors; resolving returns the live theme.
    const stale = { id: 'WHITE', backgroundColor: '#ffffff', textColor: '#000000' };
    expect(resolveTheme(stale)).toBe(THEMES.WHITE);
  });

  it('resolves a legacy fixed-theme snapshot (no id) by name', () => {
    const legacy = { name: 'BLACK', backgroundColor: '#212121', textColor: '#bdbdbd' };
    expect(resolveTheme(legacy)).toBe(THEMES.BLACK);
  });

  it('returns a custom theme unchanged', () => {
    const custom = { id: 'a3f2-uuid', name: 'My theme', backgroundColor: '#abcdef' };
    expect(resolveTheme(custom)).toBe(custom);
  });

  it('does not resolve a custom theme to a fixed theme that shares its name', () => {
    // Identity is the uuid, so a custom theme named like a fixed one stays itself.
    const custom = { id: 'b71c-uuid', name: 'WHITE', backgroundColor: '#abcdef' };
    expect(resolveTheme(custom)).toBe(custom);
  });

  it('falls back to the default theme when given nothing', () => {
    expect(resolveTheme(null)).toBe(THEMES.WHITE);
  });
});

describe('fixed THEMES', () => {
  it('every fixed theme carries a matching id and a link color', () => {
    for (const [key, theme] of Object.entries(THEMES)) {
      expect(theme.id).toBe(key);
      expect(theme.linkColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
