
const UserKinds = {
  SUPERUSER: 'SUPERUSER',
  ADMIN: 'ADMIN',
  LEARNER: 'LEARNER',
  ANONYMOUS: 'ANONYMOUS',
};

const ContentKinds = {
  AUDIO: 'audio',
  DOCUMENT: 'document',
  VIDEO: 'video',
  EXERCISE: 'exercise',
};

const MasteryLoggingMap = {
  id: 'id',
  summarylog: 'summarylog',
  start_timestamp: 'start_timestamp',
  completion_timestamp: 'completion_timestamp',
  end_timestamp: 'end_timestamp',
  mastery_level: 'mastery_level',
  mastery_criterion: 'mastery_criterion',
  complete: 'complete',
  responsehistory: 'responsehistory',
  user: 'user',
  pastattempts: 'pastattempts',
  totalattempts: 'totalattempts',
};

const AttemptLoggingMap = {
  id: 'id',
  item: 'item',
  start_timestamp: 'start_timestamp',
  completion_timestamp: 'completion_timestamp',
  end_timestamp: 'end_timestamp',
  time_spent: 'time_spent',
  complete: 'complete',
  correct: 'correct',
  answer: 'answer',
  simple_answer: 'simple_answer',
  interaction_history: 'interaction_history',
  masterylog: 'masterylog',
  user: 'user',
  hinted: 'hinted',
};

const InteractionTypes = {
  hint: 'hint',
};

// a name for every URL pattern
const PageNames = {
  EXPLORE_ROOT: 'EXPLORE_ROOT',
  EXPLORE_CHANNEL: 'EXPLORE_CHANNEL',
  EXPLORE_TOPIC: 'EXPLORE_TOPIC',
  EXPLORE_CONTENT: 'EXPLORE_CONTENT',
  LEARN_ROOT: 'LEARN_ROOT',
  LEARN_CHANNEL: 'LEARN_CHANNEL',
  LEARN_CONTENT: 'LEARN_CONTENT',
  SCRATCHPAD: 'SCRATCHPAD',
  CONTENT_UNAVAILABLE: 'CONTENT_UNAVAILABLE',
};

// switch between modes
const PageModes = {
  EXPLORE: 'EXPLORE',
  LEARN: 'LEARN',
};


module.exports = {
  UserKinds,
  ContentKinds,
  MasteryLoggingMap,
  AttemptLoggingMap,
  InteractionTypes,
  PageNames,
  PageModes,
};
