const PageNames = {
  COACH_ROOT: 'COACH_ROOT',
  REPORTS_NO_QUERY: 'REPORTS_NO_QUERY',
  REPORTS: 'REPORTS',
};

const ReportsOptions = {
  CONTENT_SCOPE_OPTIONS: ['root', 'topic', 'content'],
  USER_SCOPE_OPTIONS: ['facility', 'classroom', 'learnergroup', 'user'],
  ALL_OR_RECENT_OPTIONS: ['all', 'recent'],
  VIEW_BY_CONTENT_OR_LEARNERS_OPTIONS: ['content_view', 'user_view'],
  SORT_COLUMN_OPTIONS: ['name', 'exercise_progress', 'content_progress', 'date'],
  SORT_ORDER_OPTIONS: ['asc', 'desc'],
};


module.exports = {
  PageNames,
  ReportsOptions,
};
