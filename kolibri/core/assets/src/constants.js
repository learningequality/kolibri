
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
  id: 'pk',
  start_timestamp: 'start_timestamp',
  completion_timestamp: 'completion_timestamp',
  end_timestamp: 'end_timestamp',
  mastery_criterion: 'mastery_criterion',
  complete: 'complete',
  responsehistory: 'responsehistory',
};

const AttemptLoggingMap = {
  id: 'pk',
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
};

module.exports = {
  UserKinds,
  ContentKinds,
  MasteryLoggingMap,
  AttemptLoggingMap,
};
