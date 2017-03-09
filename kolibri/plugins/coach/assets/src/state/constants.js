const PageNames = {
  COACH_CLASS_LIST_PAGE: 'COACH_CLASS_LIST_PAGE',
  COACH_RECENT_PAGE: 'COACH_RECENT_PAGE',
  COACH_TOPICS_PAGE: 'COACH_TOPICS_PAGE',
  COACH_EXAMS_PAGE: 'COACH_EXAMS_PAGE',
  COACH_LEARNERS_PAGE: 'COACH_LEARNERS_PAGE',
  COACH_GROUPS_PAGE: 'COACH_GROUPS_PAGE',
  COACH_CONTENT_LEARNERS_PAGE: 'COACH_CONTENT_LEARNERS_PAGE',
};

const ContentScopes = {
  ROOT: 'root',
  TOPIC: 'topic',
  CONTENT: 'content',
};

const UserScopes = {
  FACILITY: 'facility',
  CLASSROOM: 'classroom',
  LEARNERGROUP: 'learnergroup',
  USER: 'user',
};

const AllOrRecent = {
  ALL: 'all',
  RECENT: 'recent',
};

const ViewBy = {
  LEARNERS: 'user_view',
  CONTENT: 'content_view',
};

const TableColumns = {
  NAME: 'name',
  EXERCISE: 'exercise_progress',
  CONTENT: 'content_progress',
  DATE: 'date',
};

const SortOrders = {
  ASCENDING: 'asc',
  DESCENDING: 'desc',
  NONE: 'none',
};

const Modals = {
  CREATE_GROUP: 'CREATE_GROUP',
};

module.exports = {
  PageNames,
  ContentScopes,
  UserScopes,
  AllOrRecent,
  ViewBy,
  TableColumns,
  SortOrders,
  Modals,
};
