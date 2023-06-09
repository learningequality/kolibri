import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import navComponents from 'kolibri.utils.navComponents';
import urls from 'kolibri.urls';
import coreStrings from 'kolibri.utils.coreStrings';
import baseRoutes from '../baseRoutes';

const sideNavConfig = {
  name: 'FacilityManagementSideNavEntry',
  get url() {
    return urls['kolibri:kolibri.plugins.facility:facility_management']();
  },
  get routes() {
    return [
      {
        label: coreStrings.$tr('classesLabel'),
        route: baseRoutes.classes.path,
        name: baseRoutes.classes.name,
      },
      {
        label: coreStrings.$tr('usersLabel'),
        route: baseRoutes.users.path,
        name: baseRoutes.users.name,
      },
      {
        label: coreStrings.$tr('settingsLabel'),
        route: baseRoutes.settings.path,
        name: baseRoutes.settings.name,
      },
      {
        label: coreStrings.$tr('dataLabel'),
        route: baseRoutes.data.path,
        name: baseRoutes.data.name,
      },
    ];
  },
  get label() {
    return coreStrings.$tr('facilityLabel');
  },
  icon: 'facility',
  role: UserKinds.ADMIN,
  priority: 10,
  fullFacilityOnly: true,
};

navComponents.register(sideNavConfig);

export default sideNavConfig;
