/**
 * xAPI Constants and Vocabulary
 */

// Known XAPI verbs, based on the ADL XAPI vocabulary:
// https://github.com/adlnet/xapi-authored-profiles/blob/master/adl/v1.0/adl.jsonld
export const XAPIVerbMap = {
  attended: 'http://adlnet.gov/expapi/verbs/attended',
  imported: 'http://adlnet.gov/expapi/verbs/imported',
  interacted: 'http://adlnet.gov/expapi/verbs/interacted',
  attempted: 'http://adlnet.gov/expapi/verbs/attempted',
  registered: 'http://adlnet.gov/expapi/verbs/registered',
  progressed: 'http://adlnet.gov/expapi/verbs/progressed',
  preferred: 'http://adlnet.gov/expapi/verbs/preferred',
  commented: 'http://adlnet.gov/expapi/verbs/commented',
  answered: 'http://adlnet.gov/expapi/verbs/answered',
  asked: 'http://adlnet.gov/expapi/verbs/asked',
  launched: 'http://adlnet.gov/expapi/verbs/launched',
  'logged-in': 'https://w3id.org/xapi/adl/verbs/logged-in',
  shared: 'http://adlnet.gov/expapi/verbs/shared',
  'logged-out': 'https://w3id.org/xapi/adl/verbs/logged-out',
  voided: 'http://adlnet.gov/expapi/verbs/voided',
  exited: 'http://adlnet.gov/expapi/verbs/exited',
  experienced: 'http://adlnet.gov/expapi/verbs/experienced',
  mastered: 'http://adlnet.gov/expapi/verbs/mastered',
  // CMI5 specification verbs
  completed: 'http://adlnet.gov/expapi/verbs/completed',
  failed: 'http://adlnet.gov/expapi/verbs/failed',
  initialized: 'http://adlnet.gov/expapi/verbs/initialized',
  passed: 'http://adlnet.gov/expapi/verbs/passed',
  responded: 'http://adlnet.gov/expapi/verbs/responded',
  resumed: 'http://adlnet.gov/expapi/verbs/resumed',
  scored: 'http://adlnet.gov/expapi/verbs/scored',
  suspended: 'http://adlnet.gov/expapi/verbs/suspended',
  terminated: 'http://adlnet.gov/expapi/verbs/terminated',
  // H5P custom verbs
  downloaded: 'http://h5p.org/x-api/verbs/downloaded',
  copied: 'http://h5p.org/x-api/verbs/copied',
  'accessed-reuse': 'http://h5p.org/x-api/verbs/accessed-reuse',
  'accessed-embed': 'http://h5p.org/x-api/verbs/accessed-embed',
  'accessed-copyright': 'http://h5p.org/x-api/verbs/accessed-copyright',
};

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
