import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import baseRoutes from '../routes/baseRoutes';
import { learnStrings } from './commonLearnStrings';

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.learn:learn']();
  },
  get routes() {
    return [
      {
        label: coreStrings.$tr('homeLabel'),
        icon: 'dashboard',
        route: baseRoutes.home.path,
        name: baseRoutes.home.name,
      },
      {
        label: coreStrings.$tr('libraryLabel'),
        icon: 'library',
        route: baseRoutes.library.path,
        name: baseRoutes.library.name,
      },
      {
        label: coreStrings.$tr('bookmarksLabel'),
        icon: 'bookmark',
        route: baseRoutes.bookmarks.path,
        name: baseRoutes.bookmarks.name,
      },
    ];
  },
  get label() {
    return learnStrings.$tr('learnLabel');
  },
  icon: 'learn',
  bottomBar: true,
});
