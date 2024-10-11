import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { UserKinds } from 'kolibri/constants';
import baseRoutes from '../routes/baseRoutes';
import { coachStrings } from './common/commonCoachStrings';

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.coach:coach']();
  },
  get routes() {
    return [
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
  },
  get label() {
    return coreStrings.$tr('coachLabel');
  },
  icon: 'coach',
  role: UserKinds.COACH,
  fullFacilityOnly: true,
});
