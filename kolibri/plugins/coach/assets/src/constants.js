const PageNames = {
  CLASS_LIST: 'CLASS_LIST',
  RECENT: 'RECENT',
  RECENT_CHANNEL_SELECT: 'RECENT_CHANNEL_SELECT',
  TOPICS: 'TOPICS',
  EXAMS: 'EXAMS',
  LEARNERS: 'LEARNERS',
  GROUPS: 'GROUPS',
  EXERCISE_RENDER: 'EXERCISE_RENDER',
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
