import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import navComponents from 'kolibri.utils.navComponents';
import urls from 'kolibri.urls';
import coreStrings from 'kolibri.utils.coreStrings';
import baseRoutes from '../routes/baseRoutes';
import { deviceString } from './commonDeviceStrings';
import plugin_data from 'plugin_data';

const sideNavConfig = {
  name: 'DeviceManagementSideNavEntry',

  get url() {
    return urls['kolibri:kolibri.plugins.device:device_management']();
  },
  get routes() {
    if (plugin_data.isSubsetOfUsersDevice) {
      return {
        label: coreStrings.$tr('channelsLabel'),
        route: baseRoutes.content.path,
      };
    } else {
      return [
        {
          label: coreStrings.$tr('channelsLabel'),
          route: baseRoutes.content.path,
        },
        {
          label: deviceString('permissionsLabel'),
          route: baseRoutes.permissions.path,
        },
        {
          label: coreStrings.$tr('facilitiesLabel'),
          route: baseRoutes.facilities.path,
        },
        {
          label: coreStrings.$tr('infoLabel'),
          route: baseRoutes.info.path,
        },
        {
          label: coreStrings.$tr('settingsLabel'),
          route: baseRoutes.settings.path,
        },
      ];
    }
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
