import { get } from '@vueuse/core';
import { UserKinds } from 'kolibri/constants';
import useUser from 'kolibri/composables/useUser';
import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import { createTranslator } from 'kolibri/utils/i18n';
import baseRoutes from '../routes/baseRoutes';

const navStrings = createTranslator('DeviceManagementSideNavEntryStrings', {
  channelsLabel: {
    message: 'Channels',
    context:
      'Channels are collections of educational resources (video, audio, document files or interactive apps) prepared and organized by the channel curator for their use in Kolibri.\n\nA learner will see a set of channels available to them when they first open Kolibri.',
  },
  facilitiesLabel: {
    message: 'Facilities',
    context:
      'Facilities are the centers of education which are managed in Kolibri, such as a school. To manage facilities on a given device, a user must have super admin permissions.',
  },
  usersLabel: {
    message: 'Users',
    context:
      'A user is any person who has access to a facility in Kolibri. There are four main types of users in Kolibri: Learners, Coaches, Admins and Super admins.',
  },
  infoLabel: {
    message: 'Info',
    context: "Title of tab in 'Device' section.",
  },
  settingsLabel: {
    message: 'Settings',
    context: "Title of tab used in 'Facility' and 'Device' sections.",
  },
  deviceManagementTitle: {
    message: 'Device',
    context:
      'The device is the physical or virtual machine that has the Kolibri server installed on it.',
  },
  permissionsLabel: {
    message: 'Permissions',
    context: "Title of tab in 'Device' section.",
  },
});

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.device:device_management']();
  },
  get routes() {
    const { canManageContent, isSuperuser, isLearnerOnlyImport } = useUser();
    const routes = [];
    const routeDefs = [
      {
        label: navStrings.$tr('channelsLabel'),
        route: baseRoutes.content.path,
        icon: 'channel',
        name: baseRoutes.content.name,
        condition: get(canManageContent) || get(isSuperuser),
      },
      {
        label: navStrings.$tr('facilitiesLabel'),
        route: baseRoutes.facilities.path,
        icon: 'facility',
        name: baseRoutes.facilities.name,
        condition: get(isSuperuser) && !get(isLearnerOnlyImport),
      },
      {
        label: navStrings.$tr('usersLabel'),
        route: baseRoutes.users.path,
        icon: 'audience',
        name: baseRoutes.users.name,
        condition: get(isSuperuser) && get(isLearnerOnlyImport),
      },
      {
        label: navStrings.$tr('permissionsLabel'),
        route: baseRoutes.permissions.path,
        icon: 'permissions',
        name: baseRoutes.permissions.name,
        condition: get(isSuperuser),
      },
      {
        label: navStrings.$tr('infoLabel'),
        route: baseRoutes.info.path,
        icon: 'deviceInfo',
        name: baseRoutes.info.name,
        condition: get(isSuperuser),
      },
      {
        label: navStrings.$tr('settingsLabel'),
        route: baseRoutes.settings.path,
        icon: 'settings',
        name: baseRoutes.settings.name,
        condition: get(isSuperuser),
      },
    ];
    routeDefs.forEach(routeDef => {
      if (routeDef.condition) {
        routes.push(routeDef);
      }
    });
    return routes;
  },
  get label() {
    return navStrings.$tr('deviceManagementTitle');
  },
  icon: 'device',
  role: UserKinds.CAN_MANAGE_CONTENT,
});
