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
        label: coachStrings.$tr('reportsLabel'),
        route: baseRoutes.reports.path,
        icon: 'reports',
        name: baseRoutes.reports.name,
      },
      {
        label: coachStrings.$tr('planLabel'),
        route: baseRoutes.plan.path,
        icon: 'edit',
        name: baseRoutes.plan.name,
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
