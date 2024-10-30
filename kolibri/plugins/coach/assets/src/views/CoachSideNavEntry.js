import registerNavItem from 'kolibri.utils.registerNavItem';
import urls from 'kolibri.urls';
import coreStrings from 'kolibri.utils.coreStrings';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
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
    ];
  },
  get label() {
    return coreStrings.$tr('coachLabel');
  },
  icon: 'coach',
  role: UserKinds.COACH,
  fullFacilityOnly: true,
});
