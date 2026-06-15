import { UserKinds } from 'kolibri/constants';
import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import { createTranslator } from 'kolibri/utils/i18n';
import baseRoutes from '../baseRoutes';

const navStrings = createTranslator('FacilityManagementSideNavEntryStrings', {
  classesLabel: {
    message: 'Classes',
    context:
      'In the classes section of Kolibri users can view the list of all the classes in their facility, with the number of enrolled users for each class, and the coaches assigned.',
  },
  usersLabel: {
    message: 'Users',
    context:
      'A user is any person who has access to a facility in Kolibri. There are four main types of users in Kolibri: Learners, Coaches, Admins and Super admins.',
  },
  settingsLabel: {
    message: 'Settings',
    context: "Title of tab used in 'Facility' and 'Device' sections.",
  },
  dataLabel: {
    message: 'Data',
    context: "Title of tab in 'Facility' section.",
  },
  facilityLabel: {
    message: 'Facility',
    context: 'A facility is a center of education, such as a school.',
  },
});

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.facility:facility_management']();
  },
  get routes() {
    return [
      {
        label: navStrings.$tr('classesLabel'),
        route: baseRoutes.classes.path,
        icon: 'classes',
        name: baseRoutes.classes.name,
      },
      {
        label: navStrings.$tr('usersLabel'),
        route: baseRoutes.users.path,
        icon: 'people',
        name: baseRoutes.users.name,
      },
      {
        label: navStrings.$tr('settingsLabel'),
        route: baseRoutes.settings.path,
        icon: 'settings',
        name: baseRoutes.settings.name,
      },
      {
        label: navStrings.$tr('dataLabel'),
        route: baseRoutes.data.path,
        icon: 'save',
        name: baseRoutes.data.name,
      },
    ];
  },
  get label() {
    return navStrings.$tr('facilityLabel');
  },
  icon: 'facility',
  role: UserKinds.ADMIN,
  fullFacilityOnly: true,
});
