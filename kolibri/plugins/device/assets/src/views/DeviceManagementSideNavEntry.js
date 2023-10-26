import { get } from '@vueuse/core';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import useUser from 'kolibri.coreVue.composables.useUser';
import navComponents from 'kolibri.utils.navComponents';
import urls from 'kolibri.urls';
import coreStrings from 'kolibri.utils.coreStrings';
import baseRoutes from '../routes/baseRoutes';
import { deviceString } from './commonDeviceStrings';

const sideNavConfig = {
  name: 'DeviceManagementSideNavEntry',

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
        name: baseRoutes.content.name,
        condition: get(canManageContent) || get(isSuperuser),
      },
      {
        label: coreStrings.$tr('facilitiesLabel'),
        route: baseRoutes.facilities.path,
        name: baseRoutes.facilities.name,
        condition: get(isSuperuser) && !get(isLearnerOnlyImport),
      },
      {
        label: deviceString('permissionsLabel'),
        route: baseRoutes.permissions.path,
        name: baseRoutes.permissions.name,
        condition: get(isSuperuser),
      },
      {
        label: coreStrings.$tr('infoLabel'),
        route: baseRoutes.info.path,
        name: baseRoutes.info.name,
        condition: get(isSuperuser),
      },
      {
        label: coreStrings.$tr('settingsLabel'),
        route: baseRoutes.settings.path,
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
  priority: 10,
};

navComponents.register(sideNavConfig);

export default sideNavConfig;
