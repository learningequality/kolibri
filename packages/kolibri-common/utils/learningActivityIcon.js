import camelCase from 'lodash/camelCase';

/**
 * Maps a learning activity constant key (e.g. 'WATCH', 'EXPLORE') to the
 * KDS icon name for its shaded activity icon.
 * @param {string} key - The learning activity constant key (e.g. 'WATCH', 'EXPLORE').
 * @returns {string} The KDS shaded activity icon name.
 */
export function getLearningActivityIcon(key) {
  // EXPLORE's icon is named 'interact' rather than 'explore'
  if (key === 'EXPLORE') {
    return 'interactShaded';
  }
  return `${camelCase(key)}Shaded`;
}
