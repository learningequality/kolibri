import invert from 'lodash/invert';
import Subjects from 'kolibri-constants/labels/Subjects';
// coach-facing
export { default as ContentNodeResourceType } from 'kolibri-constants/labels/ResourceType';
export { default as LearningActivities } from 'kolibri-constants/labels/LearningActivities';
export { default as AccessibilityCategories } from 'kolibri-constants/labels/AccessibilityCategories';
// Used to categorize the level or audience of content
export { default as ContentLevels } from 'kolibri-constants/labels/Levels';
export { default as ResourcesNeededTypes } from 'kolibri-constants/labels/Needs';
export { default as Categories } from 'kolibri-constants/labels/Subjects';

export const UserKinds = {
  ADMIN: 'admin',
  COACH: 'coach',
  LEARNER: 'learner',
  SUPERUSER: 'superuser',
  ANONYMOUS: 'anonymous',
  ASSIGNABLE_COACH: 'classroom assignable coach',
  CAN_MANAGE_CONTENT: 'can manage content',
};

export const CollectionKinds = {
  CLASSROOM: 'classroom',
  LEARNERGROUP: 'learnergroup',
  ADHOCLEARNERSGROUP: 'adhoclearnersgroup',
};

export const ContentNodeKinds = {
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
  BOOKMARK: 'bookmark',
};

export const CategoriesLookup = invert(Subjects);

export const AllCategories = 'all_categories';

export const NoCategories = 'no_categories';

// used internally on the client as a hack to allow content-icons to display users
export const USER = 'user';

export const InteractionTypes = {
  hint: 'hint',
  answer: 'answer',
  error: 'error',
};

// enum values for `assessmentdata.mastery_model.type` field
// from le-utils/le_utils/constants/exercises.py
export const MasteryModelTypes = Object.freeze({
  do_all: 'do_all',
  num_correct_in_a_row_2: 'num_correct_in_a_row_2',
  num_correct_in_a_row_3: 'num_correct_in_a_row_3',
  num_correct_in_a_row_5: 'num_correct_in_a_row_5',
  num_correct_in_a_row_10: 'num_correct_in_a_row_10',
  m_of_n: 'm_of_n',
  quiz: 'quiz',
});

export const MasteryModelGenerators = {
  [MasteryModelTypes.do_all]: assessmentIds => ({
    m: assessmentIds.length,
    n: assessmentIds.length,
  }),
  [MasteryModelTypes.num_correct_in_a_row_2]: () => ({ m: 2, n: 2 }),
  [MasteryModelTypes.num_correct_in_a_row_3]: () => ({ m: 3, n: 3 }),
  [MasteryModelTypes.num_correct_in_a_row_5]: () => ({ m: 5, n: 5 }),
  [MasteryModelTypes.num_correct_in_a_row_10]: () => ({ m: 10, n: 10 }),
  [MasteryModelTypes.m_of_n]: (assessmentIds, masteryModel) => masteryModel,
};

// How many points is a completed content item worth?
export const MaxPointsPerContent = 500;

export const LoginErrors = {
  PASSWORD_MISSING: 'PASSWORD_MISSING',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  PASSWORD_NOT_SPECIFIED: 'PASSWORD_NOT_SPECIFIED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
};

export const PermissionTypes = {
  SUPERUSER: 'SUPERUSER',
  LIMITED_PERMISSIONS: 'LIMITED_PERMISSIONS',
  NO_DEVICE_PERMISSIONS: 'NO_DEVICE_PERMISSIONS',
};

export const SIGNED_OUT_DUE_TO_INACTIVITY = 'SIGNED_OUT_DUE_TO_INACTIVITY';

export const UPDATE_MODAL_DISMISSED = 'UPDATE_MODAL_DISMISSED';

export const LESSON_VISIBILITY_MODAL_DISMISSED = 'LESSON_VISIBILITY_MODAL_DISMISSED';

export const QUIZ_REPORT_VISIBILITY_MODAL_DISMISSED = 'QUIZ_REPORT_VISIBILITY_MODAL_DISMISSED';

export const NavComponentSections = {
  ACCOUNT: 'account',
};

export const SyncStatus = {
  RECENTLY_SYNCED: 'RECENTLY_SYNCED',
  SYNCING: 'SYNCING',
  QUEUED: 'QUEUED',
  UNABLE_TO_SYNC: 'UNABLE_TO_SYNC',
  NOT_RECENTLY_SYNCED: 'NOT_RECENTLY_SYNCED',
  UNABLE_OR_NOT_SYNCED: 'UNABLE_OR_NOT_SYNCED',
  INSUFFICIENT_STORAGE: 'INSUFFICIENT_STORAGE',
  NOT_CONNECTED: 'NOT_CONNECTED',
};

export const LearnerDeviceStatus = {
  INSUFFICIENT_STORAGE: 'InsufficientStorage',
};

export const DownloadRequestStatus = {
  QUEUED: 'QUEUED',
  DOWNLOADED: 'DOWNLOADED',
  FAILED: 'FAILED',
};

export const DownloadRequestReason = {
  USER_INITIATED: 'USER_INITIATED',
  DOWNLOADED_BY_ADMIN: 'DOWNLOADED_BY_ADMIN',
  AUTO_SYNCED: 'AUTO_SYNCED',
};

export const ERROR_CONSTANTS = {
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
  ALREADY_REGISTERED_FOR_COMMUNITY: 'ALREADY_REGISTERED_FOR_COMMUNITY',
  // 401 error constants
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_USERNAME: 'INVALID_USERNAME',
  // 404 error constants
  NOT_FOUND: 'NOT_FOUND',
  INVALID_KDP_REGISTRATION_TOKEN: 'INVALID_KDP_REGISTRATION_TOKEN',
  // 403 error constants
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  PASSWORD_NOT_SPECIFIED: 'PASSWORD_NOT_SPECIFIED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  DEVICE_LIMITATIONS: 'DEVICE_LIMITATIONS',
};

export const ContentErrorConstants = {
  // These are constants that can be used to define the type of error that a
  // content renderer has encountered.
  LOADING_ERROR: 'LOADING_ERROR',
};

export const DemographicConstants = {
  NOT_SPECIFIED: 'NOT_SPECIFIED',
  DEFERRED: 'DEFERRED',
};

// See FacilityUser model
export const FacilityUserGender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  ...DemographicConstants,
};

export const IsPinAuthenticated = 'is_pin_authenticated';

// maps to possible network applications that we import/export content from
export const ApplicationTypes = {
  KOLIBRI: 'kolibri',
  STUDIO: 'studio',
};

// aliasing 'informal' to 'personal' since it's how we talk about it
export const Presets = Object.freeze({
  PERSONAL: 'informal',
  FORMAL: 'formal',
  NONFORMAL: 'nonformal',
});

// This should be kept in sync with the value in
// kolibri/core/exams/constants.py
export const MAX_QUESTIONS_PER_QUIZ_SECTION = 25;

export const DisconnectionErrorCodes = [0, 502, 504, 511];

export const RENDERER_SUFFIX = '_renderer';
