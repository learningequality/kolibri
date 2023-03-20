<template>

  <CoreMenuOption
    :label="$tr('device')"
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
  import plugin_data from 'plugin_data';

  const component = {
    name: 'DeviceManagementSideNavEntry',
    components: {
      CoreMenuOption,
    },
    mixins: [commonCoreStrings],
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
            text: this.$tr('permissionsLabel'),
            route: this.generateNavRoute(DevicePageNames.MANAGE_PERMISSIONS_PAGE),
          },
          facilities: {
            text: this.coreString('facilitiesLabel'),
            route: this.generateNavRoute(DevicePageNames.FACILITIES_PAGE),
          },
          info: {
            text: this.$tr('infoLabel'),
            route: this.generateNavRoute(DevicePageNames.DEVICE_INFO_PAGE),
          },
          settings: {
            text: this.$tr('settingsLabel'),
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
    $trs: {
      device: {
        message: 'Device',
        context:
          'The device is the physical or virtual machine that has the Kolibri server installed on it.',
      },
      permissionsLabel: {
        message: 'Permissions',
        context: 'Refers to the Device > Permissions tab.',
      },
      infoLabel: {
        message: 'Info',
        context: 'Refers to the Device > Info tab.',
      },
      settingsLabel: {
        message: 'Settings',
        context: 'Refers to the Device > Settings tab.\n',
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
