<template>

  <CoreMenuOption
    :label="deviceString('deviceManagementTitle')"
    icon="device"
    :link="url"
    :subRoutes="isSubsetOfUsersDevice ? routes : adminDeviceRoutes"
  />

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { generateNavRoute } from '../../../../../core/assets/src/utils/generateNavRoutes';
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
            label: this.coreString('channelsLabel'),
            route: baseRoutes.content.path,
          },
        };
      },
      adminDeviceRoutes() {
        return [
          {
            label: this.deviceString('permissionsLabel'),
            route: baseRoutes.permissions.path,
          },
          {
            label: this.coreString('facilitiesLabel'),
            route: baseRoutes.facilities.path,
          },
          {
            label: this.coreString('infoLabel'),
            route: baseRoutes.info.path,
          },
          {
            label: this.coreString('settingsLabel'),
            route: baseRoutes.settings.path,
          },
        ];
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
