const PageNames = {
  COACH_CLASS_LIST_PAGE: 'COACH_CLASS_LIST_PAGE',
  COACH_RECENT_PAGE: 'COACH_RECENT_PAGE',
  COACH_RECENT_PAGE_CHANNEL_SELECT: 'COACH_RECENT_PAGE_CHANNEL_SELECT',
  COACH_TOPICS_PAGE: 'COACH_TOPICS_PAGE',
  COACH_EXAMS_PAGE: 'COACH_EXAMS_PAGE',
  COACH_LEARNERS_PAGE: 'COACH_LEARNERS_PAGE',
  COACH_GROUPS_PAGE: 'COACH_GROUPS_PAGE',
  COACH_EXERCISE_RENDER_PAGE: 'COACH_EXERCISE_RENDER_PAGE',
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

const GroupModals = {
  CREATE_GROUP: 'CREATE_GROUP',
  RENAME_GROUP: 'RENAME_GROUP',
  DELETE_GROUP: 'DELETE_GROUP',
  MOVE_LEARNERS: 'MOVE_LEARNERS',
};

module.exports = {
  PageNames,
  ContentScopes,
  UserScopes,
  AllOrRecent,
  ViewBy,
  TableColumns,
  SortOrders,
  GroupModals,
};
