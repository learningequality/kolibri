import { Categories, CategoriesLookup } from 'kolibri.coreVue.vuex.constants';
import plugin_data from 'plugin_data';

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
};

// switch between modes
export const PageModes = {
  TOPICS: 'TOPICS',
  RECOMMENDED: 'RECOMMENDED',
  SEARCH: 'SEARCH',
  EXAM: 'EXAM',
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
  [PageNames.TOPICS_CONTENT]: 'topicsTree',
  [PageNames.TOPICS_TOPIC]: 'topicsTree',
  [PageNames.TOPICS_TOPIC_SEARCH]: 'topicsTree',
};

export const libraryCategories = {};

const availablePaths = {};

(plugin_data.categories || []).map(key => {
  const paths = key.split('.');
  let path = '';
  for (let path_segment of paths) {
    path = path === '' ? path_segment : path + '.' + path_segment;
    availablePaths[path] = true;
  }
});
// Create a nested object representing the hierarchy of categories
for (let value of Object.values(Categories)
  // Sort by the length of the key path to deal with
  // shorter key paths first.
  .sort((a, b) => a.length - b.length)) {
  // Split the value into the paths so we can build the object
  // down the path to create the nested representation
  const ids = value.split('.');
  // Start with an empty path
  let path = '';
  // Start with the global object
  let nested = libraryCategories;
  for (let fragment of ids) {
    // Add the fragment to create the path we examine
    path += fragment;
    // Check to see if this path is one of the paths
    // that is available on this device
    if (availablePaths[path]) {
      // Lookup the human readable key for this path
      const nestedKey = CategoriesLookup[path];
      // Check if we have already represented this in the object
      if (!nested[nestedKey]) {
        // If not, add an object representing this category
        nested[nestedKey] = {
          // The value is the whole path to this point, so the value
          // of the key.
          value: path,
          // Nested is an object that contains any subsidiary categories
          nested: {},
        };
      }
      // For the next stage of the loop the relevant object to edit is
      // the nested object under this key.
      nested = nested[nestedKey].nested;
      // Add '.' to path so when we next append to the path,
      // it is properly '.' separated.
      path += '.';
    } else {
      break;
    }
  }
}
