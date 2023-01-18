import { PageNames } from '../constants';

// This file was created to have the core navigation routes available
// without any other dependencies such as handlers, components, etc.

export default [
  {
    name: PageNames.ROOT,
    path: '/',
  },
  {
    name: PageNames.HOME,
    path: '/home',
  },
  {
    name: PageNames.LIBRARY,
    path: '/library',
  },
  {
    name: PageNames.BOOKMARKS,
    path: '/bookmarks',
  },
  {
    path: '*',
    redirect: '/',
  },
];
