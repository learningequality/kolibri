
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
};

module.exports = {
  UserKinds,
  ContentKinds,
  MasteryLoggingMap,
  AttemptLoggingMap,
};
