
const UserKinds = {
  SUPERUSER: 'SUPERUSER',
  ADMIN: 'ADMIN',
  COACH: 'COACH',
  LEARNER: 'LEARNER',
  ANONYMOUS: 'ANONYMOUS',
};

const ContentNodeKinds = {
  AUDIO: 'audio',
  DOCUMENT: 'document',
  VIDEO: 'video',
  EXERCISE: 'exercise',
  TOPIC: 'topic',
  HTML5: 'html5',
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
};

module.exports = {
  UserKinds,
  ContentNodeKinds,
  MasteryLoggingMap,
  AttemptLoggingMap,
  InteractionTypes,
  USER,
};
