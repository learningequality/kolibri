// colors are hardcoded deliberately since Epub Reader
// themes are meant to be independent of Kolibri themes.
// Each fixed theme carries an `id` (equal to its key) that identifies it
// independently of its colors, and a `linkColor` chosen to stay legible on the
// theme's background (a dark blue on light themes, a light blue on dark ones).
export const THEMES = {
  WHITE: {
    id: 'WHITE',
    name: 'WHITE',
    backgroundColor: '#ffffff',
    hoverColor: '#eeeeee',
    textColor: '#212121',
    linkColor: '#1565c0',
  },
  BEIGE: {
    id: 'BEIGE',
    name: 'BEIGE',
    backgroundColor: '#efebe9',
    hoverColor: '#d7ccc8',
    textColor: '#4e342e',
    linkColor: '#1565c0',
  },
  GREY: {
    id: 'GREY',
    name: 'GREY',
    backgroundColor: '#424242',
    hoverColor: '#757575',
    textColor: '#ffffff',
    linkColor: '#90caf9',
  },
  BLACK: {
    id: 'BLACK',
    name: 'BLACK',
    backgroundColor: '#212121',
    hoverColor: '#616161',
    textColor: '#bdbdbd',
    linkColor: '#90caf9',
  },
  YELLOW: {
    id: 'YELLOW',
    name: 'YELLOW',
    backgroundColor: '#212121',
    hoverColor: '#616161',
    textColor: '#fff176',
    linkColor: '#90caf9',
  },
  BLUE: {
    id: 'BLUE',
    name: 'BLUE',
    backgroundColor: '#ffffff',
    hoverColor: '#eeeeee',
    textColor: '#1565c0',
    linkColor: '#0d47a1',
  },
};

// Resolve a persisted theme snapshot to its live definition. Fixed themes are
// re-resolved by id so saved selections pick up current colors (e.g. link
// colors); a legacy snapshot saved before themes had ids is resolved by name.
// Custom themes (uuid ids, absent from THEMES) are returned untouched.
export function resolveTheme(theme) {
  if (!theme) {
    return THEMES.WHITE;
  }
  if (theme.id) {
    return THEMES[theme.id] || theme;
  }
  return THEMES[theme.name] || theme;
}

// localStorage key under which learner-defined custom themes are persisted
export const CUSTOM_THEMES_STORAGE_KEY = 'kolibriEpubRendererCustomThemes';

// every theme defines its own link color; this only guards against a malformed
// snapshot that somehow lacks one, falling back to the browser default link blue
export const DEFAULT_LINK_COLOR = '#0000EE';

// the most custom themes a learner can keep at once
export const MAX_CUSTOM_THEMES = 8;

// maximum length of a custom theme name the learner can enter
export const MAX_THEME_NAME_LENGTH = 50;

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map(char => char + char)
          .join('')
      : normalized;
  return [0, 2, 4].map(start => parseInt(full.slice(start, start + 2), 16));
}

function toHexPair(value) {
  return Math.round(value).toString(16).padStart(2, '0');
}

// Perceived brightness (ITU-R BT.601) of a hex color, on a 0–255 scale.
function perceivedLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Whether a background color is dark enough that overlaid controls need a light
// (rather than dark) treatment to stay visible. Used for both fixed and custom
// themes, so a dark custom theme gets legible navigation arrows.
export function isDarkColor(hex) {
  return perceivedLuminance(hex) <= 128;
}

// Custom themes only capture background/text/link colors, but theme buttons shift
// their background on hover. Derive a subtle hover shade by blending the background
// toward black (for light backgrounds) or white (for dark ones), mirroring how the
// fixed themes pair a background with a contrasting hover color.
export function deriveHoverColor(backgroundColor) {
  const [r, g, b] = hexToRgb(backgroundColor);
  const blendTarget = isDarkColor(backgroundColor) ? 255 : 0;
  const blendRatio = 0.12;
  const blend = channel => channel + (blendTarget - channel) * blendRatio;
  return `#${toHexPair(blend(r))}${toHexPair(blend(g))}${toHexPair(blend(b))}`;
}
