<template>

  <CoreMenuOption
    :label="deviceString('device')"
    icon="device"
    :subRoutes="isSubsetOfUsersDevice ? routes : generalDeviceRoutes"
  />

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { generateNavRoute } from '../../../../../core/assets/src/utils/generateNavRoutes';
  import { PageNames as DevicePageNames } from '../constants';
  import baseRoutes from '../routes/baseRoutes';
  import commonDeviceStrings from './commonDeviceStrings';
  import plugin_data from 'plugin_data';

  const component = {
    name: 'DeviceManagementSideNavEntry',
    components: {
      CoreMenuOption,
    },
    mixins: [commonCoreStrings, commonDeviceStrings],
    data() {
      return {
        isSubsetOfUsersDevice: plugin_data.isSubsetOfUsersDevice,
      };
    },
    computed: {
      url() {
        return urls['kolibri:kolibri.plugins.device:device_management']();
      },
      routes() {
        return {
          channels: {
            text: this.coreString('channelsLabel'),
            route: this.generateNavRoute(DevicePageNames.MANAGE_CONTENT_PAGE),
          },
        };
      },
      generalDeviceRoutes() {
        return {
          permissions: {
            text: this.deviceString('permissionsLabel'),
            route: this.generateNavRoute(DevicePageNames.MANAGE_PERMISSIONS_PAGE),
          },
          facilities: {
            text: this.coreString('facilitiesLabel'),
            route: this.generateNavRoute(DevicePageNames.FACILITIES_PAGE),
          },
          info: {
            text: this.coreString('infoLabel'),
            route: this.generateNavRoute(DevicePageNames.DEVICE_INFO_PAGE),
          },
          settings: {
            text: this.coreString('settingsLabel'),
            route: this.generateNavRoute(DevicePageNames.DEVICE_SETTINGS_PAGE),
          },
        };
      },
    },
    methods: {
      generateNavRoute(route) {
        return generateNavRoute(this.url, route, baseRoutes);
      },
    },
    role: UserKinds.CAN_MANAGE_CONTENT,
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>


<style lang="scss" scoped>

  .link-container {
    height: 44px;
  }

  .link {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 44px;
    margin-left: 40px;
    font-size: 12px;
  }

  .link-text {
    text-decoration: none;
  }

</style>
