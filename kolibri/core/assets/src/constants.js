
const UserKinds = {
  ADMIN: 'admin',
  COACH: 'coach',
  LEARNER: 'learner',
  SUPERUSER: 'superuser',
  ANONYMOUS: 'anonymous',
};

const ContentNodeKinds = {
  AUDIO: 'audio',
  DOCUMENT: 'document',
  VIDEO: 'video',
  EXERCISE: 'exercise',
  TOPIC: 'topic',
  HTML5: 'html5',
  CHANNEL: 'channel', // e.g. a root topic
};

// used internally on the client as a hack to allow content-icons to display users
const USER = 'user';

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
  pastattempts: 'pastattempts',
  totalattempts: 'totalattempts',
};

const AttemptLoggingMap = {
  id: 'id',
  sessionlog: 'sessionlog',
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
  hinted: 'hinted',
};

const InteractionTypes = {
  hint: 'hint',
  answer: 'answer',
  error: 'error',
};

const MasteryModelGenerators = {
  do_all: (assessmentIds, masteryModel) => ({ m: assessmentIds.length, n: assessmentIds.length }),
  num_correct_in_a_row_10: (assessmentIds, masteryModel) => ({ m: 10, n: 10 }),
  num_correct_in_a_row_3: (assessmentIds, masteryModel) => ({ m: 3, n: 3 }),
  num_correct_in_a_row_5: (assessmentIds, masteryModel) => ({ m: 5, n: 5 }),
  m_of_n: (assessmentIds, masteryModel) => masteryModel,
};

/* HACK HACK

The core application should not have this knowledge
about the available plugins. However, until we have
a way for plugins to properly indicate what nav bar
widgets they supply to core and in what order, this
is a work-around.
*/
const TopLevelPageNames = {
  LEARN: 'LEARN',
  COACH: 'COACH',
  MANAGE: 'MANAGE',
  USER: 'USER',
  ABOUT: 'ABOUT',
  PROFILE: 'PROFILE',
};

module.exports = {
  UserKinds,
  ContentNodeKinds,
  MasteryLoggingMap,
  AttemptLoggingMap,
  InteractionTypes,
  USER,
  TopLevelPageNames,
  MasteryModelGenerators,
};
