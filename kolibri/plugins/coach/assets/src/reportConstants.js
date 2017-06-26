
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

const ViewBy = {
  CONTENT: 'content',
  LEARNER: 'learner',
  RECENT: 'recent',
  CHANNEL: 'channel',
};

const TableColumns = {
  NAME: 'name',
  EXERCISE: 'exercise_progress',
  CONTENT: 'content_progress',
  DATE: 'date',
  GROUP: 'group',
};

const SortOrders = {
  ASCENDING: 'asc',
  DESCENDING: 'desc',
  NONE: 'none',
};

const RECENCY_THRESHOLD_IN_DAYS = 7;

export {
  ContentScopes,
  UserScopes,
  ViewBy,
  TableColumns,
  SortOrders,
  RECENCY_THRESHOLD_IN_DAYS,
};
