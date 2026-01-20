import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { UserKinds } from 'kolibri/constants';
import plugin_data from 'kolibri-plugin-data';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import baseRoutes from '../routes/baseRoutes';
import { coachStrings } from './common/commonCoachStrings';

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.coach:coach']();
  },
  get routes() {
    const _routes = [
      {
        label: coreStrings.$tr('classHome'),
        route: baseRoutes.classHome.path,
        icon: 'dashboard',
        name: baseRoutes.classHome.name,
      },
      {
        label: coachStrings.$tr('lessonsLabel'),
        route: baseRoutes.lessons.path,
        icon: 'lesson',
        name: baseRoutes.lessons.name,
      },
      {
        label: coachStrings.$tr('quizzesLabel'),
        route: baseRoutes.quizzes.path,
        icon: 'quiz',
        name: baseRoutes.quizzes.name,
      },
      {
        label: coachStrings.$tr('learnersLabel'),
        route: baseRoutes.learners.path,
        icon: 'person',
        name: baseRoutes.learners.name,
      },
      {
        label: coachStrings.$tr('groupsLabel'),
        route: baseRoutes.groups.path,
        icon: 'group',
        name: baseRoutes.groups.name,
      },
    ];

    if (plugin_data.courses_exist) {
      // Insert 'Courses' nav item just after 'Class Home'
      _routes.splice(1, 0, {
        label: coursesStrings.$tr('coursesLabel'),
        route: baseRoutes.courses.path,
        icon: 'lesson',
        name: baseRoutes.courses.name,
      });
    }

    return _routes;
  },
  get label() {
    return coreStrings.$tr('coachLabel');
  },
  icon: 'coach',
  role: UserKinds.COACH,
  fullFacilityOnly: true,
});
