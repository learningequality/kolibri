import plugin_data from 'kolibri-plugin-data';

// a name for every URL pattern
export const PageNames = {
  ROOT: 'ROOT',
  HOME: 'HOME',
  TOPICS_TOPIC: 'TOPICS_TOPIC',
  TOPICS_TOPIC_SEARCH: 'TOPICS_TOPIC_SEARCH',
  TOPICS_CONTENT: 'TOPICS_CONTENT',
  LIBRARY: 'LIBRARY',
  CONTENT_UNAVAILABLE: 'CONTENT_UNAVAILABLE',
  EXAM_LIST: 'EXAM_LIST',
  EXAM: 'EXAM',
  EXAM_ROOT: 'EXAM_ROOT',
  BOOKMARKS: 'BOOKMARKS',
  EXPLORE_LIBRARIES: 'EXPLORE_LIBRARIES',
};

export const ExternalPageNames = {
  MY_DOWNLOADS: 'MY_DOWNLOADS',
};

export const ExternalPagePaths = {
  [ExternalPageNames.MY_DOWNLOADS]: '/my-downloads',
};

export const ClassesPageNames = {
  ALL_CLASSES: 'ALL_CLASSES',
  CLASS_ASSIGNMENTS: 'CLASS_ASSIGNMENTS',
  LESSON_PLAYLIST: 'LESSON_PLAYLIST',
  CLASS_LEARNERS_LIST_VIEWER: 'CLASS_LEARNERS_LIST_VIEWER',
  EXAM_VIEWER: 'EXAM_VIEWER',
  EXAM_REPORT_VIEWER: 'EXAM_REPORT_VIEWER',
};

export const pageNameToModuleMap = {
  [ClassesPageNames.ALL_CLASSES]: 'classes',
  [ClassesPageNames.CLASS_ASSIGNMENTS]: 'classAssignments',
  [ClassesPageNames.EXAM_VIEWER]: 'examViewer',
  [ClassesPageNames.EXAM_REPORT_VIEWER]: 'examReportViewer',
  [ClassesPageNames.LESSON_PLAYLIST]: 'lessonPlaylist',
};

export const KolibriStudioId = plugin_data.studioDevice?.instance_id;
