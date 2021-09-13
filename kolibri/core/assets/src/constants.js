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
};

// coach-facing
export const ContentNodeResourceType = {
  LESSON: 'Lesson',
  TUTORIAL: 'Tutorial',
  ACTIVITY: 'Activity',
  EXERCISE: 'Exercise',
  MEDIA: 'Media',
  BOOK: 'Book',
  GAME: 'Game',
  GUIDE: 'Guide',
  TEXTBOOK: 'Textbook',
  LESSON_PLAN: 'Lesson plan',
};

export const LearningActivities = {
  CREATE: 'create',
  LISTEN: 'listen',
  REFLECT: 'reflect',
  PRACTICE: 'practice',
  READ: 'read',
  WATCH: 'watch',
  EXPLORE: 'explore',
  TOPIC: 'topic',
};

export const ContentKindsToLearningActivitiesMap = {
  audio: LearningActivities.LISTEN,
  document: LearningActivities.READ,
  exercise: LearningActivities.PRACTICE,
  html5: LearningActivities.EXPLORE,
  video: LearningActivities.WATCH,
};

// Resource library categories and subcategoriess
export const LibraryCategories = {
  SCHOOL: 'school',
  BASIC_SKILLS: 'basicSkills',
  WORK: 'work',
  DAILY_LIFE: 'dailyLife',
  FOR_TEACHERS: 'forTeachers',
};

export const SchoolCategories = {
  MATHEMATICS: 'mathematics',
  SCIENCES: 'sciences',
  LITERATURE: 'literature',
  SOCIAL_SCIENCES: 'socialSciences',
  ARTS: 'arts',
  COMPUTER_SCIENCE: 'computerScience',
  LANGUAGE_LEARNING: 'languageLearning',
  HISTORY: 'history',
};

export const MathematicsSubcategories = {
  ARITHMETIC: 'arithmetic',
  ALGEBRA: 'algebra',
  GEOMETRY: 'geometry',
  CALCULUS: 'calculus',
  STATISTICS: 'statistics',
};

export const SciencesSubcategories = {
  BIOLOGY: 'biology',
  CHEMISTRY: 'chemistry',
  PHYSICS: 'physics',
  EARTH_SCIENCE: 'earthScience',
  ASTRONOMY: 'astronomy',
};

export const LiteratureSubcategories = {
  LITERATURE: 'literature',
  READING_COMPREHENSION: 'readingComprehension',
  WRITING: 'writing',
  LOGIC_AND_CRITICAL_THINKING: 'logicAndCriticalThinking',
};

export const SocialSciencesSubcategories = {
  POLITICAL_SCIENCE: 'politicalScience',
  SOCIOLOGY: 'sociology',
  ANTHROPOLOGY: 'anthropology',
  CIVIC_EDUCATION: 'civicEducation',
};

export const ArtsSubcategories = {
  VISUAL_ART: 'visualArt',
  MUSIC: 'music',
  DANCE: 'dance',
  DRAMA: 'drama',
};

export const ComputerScienceSubcategories = {
  PROGRAMMING: 'programming',
  MECHANICAL_ENGINEERING: 'mechanicalEngineering',
  WEB_DESIGN: 'webDesign',
};

export const BasicSkillsCategories = {
  LITERACY: 'literacy',
  NUMERACY: 'numeracy',
  DIGITAL_LITERACY: 'digitalLiteracy',
  LOGIC_AND_CRITICAL_THINKING: 'logicAndCriticalThinking',
  LEARNING_SKILLS: 'learningSkills',
};

export const WorkCategories = {
  PROFESSIONAL_SKILLS: 'professionalSkills',
  TECHNICAL_AND_VOCATIONAL_TRAINING: 'technicalAndVocationalTraining',
};

export const VocationalSubcategories = {
  TOOLS_AND_SOFTWARE_TRAINING: 'toolsAndSoftwareTraining',
  SKILLS_TRAINING: 'skillsTraining',
  INDUSTRY_AND_SECTOR_SPECIFIC: 'industryAndSectorSpecific',
};

export const DailyLifeCategories = {
  PUBLIC_HEALTH: 'publicHealth',
  ENTREPRENEURSHIP: 'entrepreneurship',
  FINANCIAL_LITERACY: 'financialLiteracy',
  CURRENT_EVENTS: 'currentEvents',
  ENVIRONMENT: 'environment',
  MEDIA_LITERACY: 'mediaLiteracy',
  DIVERSITY: 'diversity',
  MENTAL_HEALTH: 'mentalHealth',
};

export const TeachersCategories = {
  GUIDES: 'guides',
  LESSON_PLANS: 'lessonPlans',
};

export const ResourcesNeededTypes = {
  FOR_BEGINNERS: 'forBeginners',
  TEACHERS_AND_PEERS: 'toUseWithteachersAndPeers',
  PAPER_AND_PENCIL: 'toUseWithpaperAndPencil',
  NEEDS_INTERNET: 'needsInternet',
  NEEDS_MATERIALS: 'needsMaterials',
};

export const AccessibilityCategories = {
  ALL: 'all',
  SIGN_LANGUAGE: 'signLanguage',
  AUDIO_DESCRIPTION: 'audioDescription',
  TAGGED_PDF: 'taggedPdf',
  ALT_TEXT: 'altText',
  HIGH_CONTRAST: 'highContrast',
  CAPTIONS_SUBTITLES: 'captionsSubtitles',
};

// Used to categorize the level or audience of content
export const ContentLevels = {
  PRESCHOOL: 'preschool',
  LOWER_PRIMARY: 'lowerPrimary',
  UPPER_PRIMARY: 'upperPrimary',
  LOWER_SECONDARY: 'lowerSecondary',
  UPPER_SECONDARY: 'upperSecondary',
  TERTIARY: 'tertiary',
  PROFESSIONAL: 'specializedProfessionalTraining',
  BASIC_SKILLS: 'basicSkills',
  WORK_SKILLS: 'workSkills',
};

// used internally on the client as a hack to allow content-icons to display users
export const USER = 'user';

export const MasteryLoggingMap = {
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

export const AttemptLoggingMap = {
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
  NOT_CONNECTED: 'NOT_CONNECTED',
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
