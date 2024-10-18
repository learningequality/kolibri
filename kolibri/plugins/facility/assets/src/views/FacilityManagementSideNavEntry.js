import { UserKinds } from 'kolibri/constants';
import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import baseRoutes from '../baseRoutes';

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.facility:facility_management']();
  },
  get routes() {
    return [
      {
        label: coreStrings.$tr('classesLabel'),
        route: baseRoutes.classes.path,
        icon: 'classes',
        name: baseRoutes.classes.name,
      },
      {
        label: coreStrings.$tr('usersLabel'),
        route: baseRoutes.users.path,
        icon: 'people',
        name: baseRoutes.users.name,
      },
      {
        label: coreStrings.$tr('settingsLabel'),
        route: baseRoutes.settings.path,
        icon: 'settings',
        name: baseRoutes.settings.name,
      },
      {
        label: coreStrings.$tr('dataLabel'),
        route: baseRoutes.data.path,
        icon: 'save',
        name: baseRoutes.data.name,
      },
    ];
  },
  get label() {
    return coreStrings.$tr('facilityLabel');
  },
  icon: 'facility',
  role: UserKinds.ADMIN,
  fullFacilityOnly: true,
});
