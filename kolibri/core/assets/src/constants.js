const UserKinds = {
  ADMIN: 'admin',
  COACH: 'coach',
  LEARNER: 'learner',
  SUPERUSER: 'superuser',
  ANONYMOUS: 'anonymous',
  ASSIGNABLE_COACH: 'classroom assignable coach',
  CAN_MANAGE_CONTENT: 'can manage content',
};

const CollectionKinds = {
  CLASSROOM: 'classroom',
  LEARNERGROUP: 'learnergroup',
};

const ContentNodeKinds = {
  AUDIO: 'audio',
  DOCUMENT: 'document',
  VIDEO: 'video',
  EXERCISE: 'exercise',
  TOPIC: 'topic',
  HTML5: 'html5',
  CHANNEL: 'channel', // e.g. a root topic
  EXAM: 'exam',
  LESSON: 'lesson',
  CLASSROOM: 'CLASSROOM',
  ACTIVITY: 'ACTIVITY',
  SLIDESHOW: 'slideshow',
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
  user: 'user',
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
  do_all: assessmentIds => ({
    m: assessmentIds.length,
    n: assessmentIds.length,
  }),
  num_correct_in_a_row_10: () => ({ m: 10, n: 10 }),
  num_correct_in_a_row_3: () => ({ m: 3, n: 3 }),
  num_correct_in_a_row_5: () => ({ m: 5, n: 5 }),
  num_correct_in_a_row_2: () => ({ m: 2, n: 2 }),
  m_of_n: (assessmentIds, masteryModel) => masteryModel,
};

// How many points is a completed content item worth?
const MaxPointsPerContent = 500;

const LoginErrors = {
  PASSWORD_MISSING: 'PASSWORD_MISSING',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
};

const PermissionTypes = {
  SUPERUSER: 'SUPERUSER',
  LIMITED_PERMISSIONS: 'LIMITED_PERMISSIONS',
};

const SIGNED_OUT_DUE_TO_INACTIVITY = 'SIGNED_OUT_DUE_TO_INACTIVITY';

const UPDATE_MODAL_DISMISSED = 'UPDATE_MODAL_DISMISSED';

const NavComponentSections = {
  ACCOUNT: 'account',
};

const ERROR_CONSTANTS = {
  // These are an exact copy of the python module kolibri.core.error_constants
  // and should be kept in sync.
  // 400 error based constants
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',
  USER_ALREADY_IN_GROUP_IN_CLASS: 'USER_ALREADY_IN_GROUP_IN_CLASS',
  MISSING_PASSWORD: 'MISSING_PASSWORD',
  MAX_LENGTH: 'MAX_LENGTH',
  INVALID: 'INVALID',
  UNIQUE: 'UNIQUE',
  INVALID_NETWORK_LOCATION_FORMAT: 'INVALID_NETWORK_LOCATION_FORMAT',
  NETWORK_LOCATION_NOT_FOUND: 'NETWORK_LOCATION_NOT_FOUND',
  // 401 error constants
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  // 404 error constants
  NOT_FOUND: 'NOT_FOUND',
  // 403 error constants
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
};

export {
  UserKinds,
  ContentNodeKinds,
  MasteryLoggingMap,
  AttemptLoggingMap,
  InteractionTypes,
  USER,
  MasteryModelGenerators,
  CollectionKinds,
  MaxPointsPerContent,
  LoginErrors,
  PermissionTypes,
  SIGNED_OUT_DUE_TO_INACTIVITY,
  UPDATE_MODAL_DISMISSED,
  NavComponentSections,
  ERROR_CONSTANTS,
};
