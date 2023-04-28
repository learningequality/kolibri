import navComponents from 'kolibri.utils.navComponents';
import urls from 'kolibri.urls';
import coreStrings from 'kolibri.utils.coreStrings';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import baseRoutes from '../routes/baseRoutes';
import { coachStrings } from './common/commonCoachStrings';

const sideNavConfig = {
  name: 'CoachSideNavEntry',
  get url() {
    return urls['kolibri:kolibri.plugins.coach:coach']();
  },
  get routes() {
    return [
      {
        label: coreStrings.$tr('classHome'),
        route: baseRoutes.classHome.path,
      },
      {
        label: coachStrings.$tr('reportsLabel'),
        route: baseRoutes.reports.path,
      },
      {
        label: coachStrings.$tr('planLabel'),
        route: baseRoutes.plan.path,
      },
    ];
  },
  get label() {
    return coreStrings.$tr('coachLabel');
  },
  icon: 'coach',
  role: UserKinds.COACH,
  priority: 10,
  fullFacilityOnly: true,
};

navComponents.register(sideNavConfig);

export default sideNavConfig;
