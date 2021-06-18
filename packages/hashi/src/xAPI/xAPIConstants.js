/*
 * xAPI Constants
 */

import 'core-js/features/set';

export const OBJECT_TYPES = {
  AGENT: 'Agent',
  GROUP: 'Group',
  ACTIVITY: 'Activity',
  STATEMENTREF: 'StatementRef',
  SUBSTATEMENT: 'SubStatement',
};

export const ObjectTypeChoices = new Set(Object.values(OBJECT_TYPES));

export const INTERACTION_TYPES = {
  TRUE_FALSE: 'true-false',
  CHOICE: 'choice',
  FILL_IN: 'fill-in',
  LONG_FILL_IN: 'long-fill-in',
  MATCHING: 'matching',
  PERFORMANCE: 'performance',
  SEQUENCING: 'sequencing',
  LIKERT: 'likert',
  NUMERIC: 'numeric',
  OTHER: 'other',
};

export const InteractionTypeChoices = new Set(Object.values(INTERACTION_TYPES));

export const interactionOptionsLookup = {
  choices: new Set([INTERACTION_TYPES.CHOICE, INTERACTION_TYPES.SEQUENCING]),
  scale: new Set([INTERACTION_TYPES.LIKERT]),
  source: new Set([INTERACTION_TYPES.MATCHING]),
  target: new Set([INTERACTION_TYPES.MATCHING]),
  steps: new Set([INTERACTION_TYPES.PERFORMANCE]),
};

export const OUTER_DELIMITER = '[,]';
export const INNER_DELIMITER = '[.]';
export const RANGE_DELIMITER = '[:]';

export const CMI_INTERACTION = 'http://adlnet.gov/expapi/activities/cmi.interaction';
