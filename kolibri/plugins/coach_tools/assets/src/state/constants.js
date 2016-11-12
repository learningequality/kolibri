const PageNames = {
  COACH_ROOT: 'COACH_ROOT',
  REPORTS_NO_QUERY: 'REPORTS_NO_QUERY',
  REPORTS: 'REPORTS',
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


/* returns an array of the values of an object */
function enumerate(obj) {
  return Object.entries(obj).map(([key, value]) => value);
}


module.exports = {
  PageNames,
  ContentScopes,
  UserScopes,
  AllOrRecent,
  ViewBy,
  TableColumns,
  SortOrders,
  enumerate,
};
