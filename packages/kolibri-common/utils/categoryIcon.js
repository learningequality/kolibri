import camelCase from 'lodash/camelCase';
import Subjects from 'kolibri-constants/labels/Subjects';

/**
 * Set of category icon tokens that exist in KDS.
 * If a category's standard icon name (camelCase + 'Resource') is not in this set,
 * we walk up the category hierarchy to find the nearest parent that has one.
 */
const VALID_ICONS = new Set([
  'artsResource',
  'basicSkillsResource',
  'computerScienceResource',
  'currentEventsResource',
  'dailyLifeResource',
  'digitalLiteracyResource',
  'diversityResource',
  'entrepreneurshipResource',
  'environmentResource',
  'financialLiteracyResource',
  'forTeachersResource',
  'guidesResource',
  'historyResource',
  'language',
  'learningSkillsResource',
  'lessonPlansResource',
  'literacyResource',
  'logicCriticalThinkingResource',
  'mathematicsResource',
  'mediaLiteracyResource',
  'mentalHealthResource',
  'numeracyResource',
  'publicHealthResource',
  'readingAndWritingResource',
  'schoolResource',
  'sciencesResource',
  'skillsResource',
  'socialSciencesResource',
]);

/**
 * Categories whose KDS icon name doesn't follow the standard
 * `camelCase(key) + 'Resource'` pattern. Only genuine naming
 * mismatches belong here — parent fallbacks are handled automatically.
 */
const NAME_OVERRIDES = {
  work: 'skillsResource',
  foundations: 'basicSkillsResource',
  languageLearning: 'language',
  foundationsLogicAndCriticalThinking: 'logicCriticalThinkingResource',
  logicAndCriticalThinking: 'logicCriticalThinkingResource',
};

/**
 * Reverse lookup: subject value path → SCREAMING_SNAKE key.
 * Built once from the Subjects constants.
 */
const _valueToKey = {};
for (const [key, value] of Object.entries(Subjects)) {
  _valueToKey[value] = key;
}

/**
 * Get the parent category key for a given category key,
 * derived from the dot-separated value paths in Subjects.
 * Returns null for top-level categories.
 * @param {string} key - A SCREAMING_SNAKE_CASE category key
 * @returns {string|null} The parent category key, or null if top-level
 */
function _getParentKey(key) {
  const value = Subjects[key];
  if (!value) return null;
  const lastDot = value.lastIndexOf('.');
  if (lastDot === -1) return null;
  const parentValue = value.slice(0, lastDot);
  return _valueToKey[parentValue] || null;
}

/**
 * Get the KDS icon name for a category key.
 * Tries the most specific icon first, then walks up the category
 * hierarchy until it finds a parent with a valid KDS icon.
 * @param {string} key - A SCREAMING_SNAKE_CASE category key (e.g. 'SCHOOL', 'DAILY_LIFE')
 * @returns {string} The corresponding KDS icon name
 */
export function getCategoryIcon(key) {
  const cc = camelCase(key);

  // Check for naming mismatches first
  if (NAME_OVERRIDES[cc]) {
    return NAME_OVERRIDES[cc];
  }

  // Try the standard pattern
  const standard = cc + 'Resource';
  if (VALID_ICONS.has(standard)) {
    return standard;
  }

  // Walk up the hierarchy to find the nearest parent with a valid icon
  let parentKey = _getParentKey(key);
  while (parentKey) {
    const parentCc = camelCase(parentKey);
    if (NAME_OVERRIDES[parentCc]) {
      return NAME_OVERRIDES[parentCc];
    }
    const parentIcon = parentCc + 'Resource';
    if (VALID_ICONS.has(parentIcon)) {
      return parentIcon;
    }
    parentKey = _getParentKey(parentKey);
  }

  // Shouldn't reach here for known categories, but safe fallback
  return standard;
}
