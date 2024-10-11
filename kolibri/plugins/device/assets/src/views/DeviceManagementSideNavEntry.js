import { get } from '@vueuse/core';
import { UserKinds } from 'kolibri/constants';
import useUser from 'kolibri/composables/useUser';
import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import baseRoutes from '../routes/baseRoutes';
import { deviceString } from './commonDeviceStrings';

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.device:device_management']();
  },
  get routes() {
    const { canManageContent, isSuperuser, isLearnerOnlyImport } = useUser();
    const routes = [];
    const routeDefs = [
      {
        label: coreStrings.$tr('channelsLabel'),
        route: baseRoutes.content.path,
        icon: 'channel',
        name: baseRoutes.content.name,
        condition: get(canManageContent) || get(isSuperuser),
      },
      {
        label: coreStrings.$tr('facilitiesLabel'),
        route: baseRoutes.facilities.path,
        icon: 'permissions',
        name: baseRoutes.facilities.name,
        condition: get(isSuperuser) && !get(isLearnerOnlyImport),
      },
      {
        label: deviceString('permissionsLabel'),
        route: baseRoutes.permissions.path,
        icon: 'facility',
        name: baseRoutes.permissions.name,
        condition: get(isSuperuser),
      },
      {
        label: coreStrings.$tr('infoLabel'),
        route: baseRoutes.info.path,
        icon: 'deviceInfo',
        name: baseRoutes.info.name,
        condition: get(isSuperuser),
      },
      {
        label: coreStrings.$tr('settingsLabel'),
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
    return deviceString('deviceManagementTitle');
  },
  icon: 'device',
  role: UserKinds.CAN_MANAGE_CONTENT,
});
