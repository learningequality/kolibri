
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
};

const SortOrders = {
  ASCENDING: 'asc',
  DESCENDING: 'desc',
  NONE: 'none',
};

module.exports = {
  ContentScopes,
  UserScopes,
  ViewBy,
  TableColumns,
  SortOrders,
};
