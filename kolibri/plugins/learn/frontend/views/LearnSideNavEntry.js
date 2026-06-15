import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import useUser from 'kolibri/composables/useUser';
import { createTranslator } from 'kolibri/utils/i18n';
import baseRoutes from '../routes/baseRoutes';

const navStrings = createTranslator('LearnSideNavEntryStrings', {
  homeLabel: {
    message: 'Home',
    context:
      "Home page is a place for learners containing summary of their activities and suggestions for what to do next. For example, they can see a list of classes they're enrolled in, their recent lessons and quizzes, and they can directly navigate to resources to continue learning from.",
  },
  libraryLabel: {
    message: 'Library',
    context:
      "The 'Library' section displays channels available on Kolibri server, and allows learners to browse, explore and filter topics and resources on their own.",
  },
  bookmarksLabel: {
    message: 'Bookmarks',
    context:
      'Bookmarks are used to give all users a way of saving a reference for a specific resource or topic to come back to later.',
  },
  learnLabel: {
    message: 'Learn',
    context:
      "Each time a learner signs in to Kolibri, the first thing they see is the  'Learn' page with the list of all the classes they are enrolled to.",
  },
});

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.learn:learn']();
  },
  get routes() {
    const { isUserLoggedIn } = useUser();
    if (!isUserLoggedIn.value) {
      return [];
    }
    return [
      {
        label: navStrings.$tr('homeLabel'),
        icon: 'dashboard',
        route: baseRoutes.home.path,
        name: baseRoutes.home.name,
      },
      {
        label: navStrings.$tr('libraryLabel'),
        icon: 'library',
        route: baseRoutes.library.path,
        name: baseRoutes.library.name,
      },
      {
        label: navStrings.$tr('bookmarksLabel'),
        icon: 'bookmark',
        route: baseRoutes.bookmarks.path,
        name: baseRoutes.bookmarks.name,
      },
    ];
  },
  get label() {
    return navStrings.$tr('learnLabel');
  },
  icon: 'learn',
  bottomBar: true,
});
