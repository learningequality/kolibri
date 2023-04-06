import { PageNames } from '../constants';

// This file was created to have the core navigation routes available
// without any other dependencies such as handlers, components, etc.

export default {
  home: {
    name: PageNames.HOME,
    path: '/home',
  },
  library: {
    name: PageNames.LIBRARY,
    path: '/library',
  },
  bookmarks: {
    name: PageNames.BOOKMARKS,
    path: '/bookmarks',
  },
};
