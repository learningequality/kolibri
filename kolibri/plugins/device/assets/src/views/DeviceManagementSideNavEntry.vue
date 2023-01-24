<template>

  <div>
    <CoreMenuOption
      :label="$tr('device')"
      :iconAfter="iconAfter"
      :link="isAppContext ? null : url"
      icon="device"
      @select="visibleSubMenu = !visibleSubMenu"
    />
    <div v-if="isAppContext && visibleSubMenu">
      <div v-for="(nestedObject, key) in routes" :key="key" class="link-container">
        <a :href="nestedObject.route" class="link" :class="$computedClass(optionStyle)">
          {{ nestedObject.text }}
        </a>
      </div>
    </div>
  </div>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import { mapGetters } from 'vuex';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { generateNavRoute } from '../../../../../core/assets/src/utils/generateNavRoutes';
  import { PageNames as DevicePageNames } from '../constants';
  import baseRoutes from '../routes/baseRoutes';

  const component = {
    name: 'DeviceManagementSideNavEntry',
    components: {
      CoreMenuOption,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        visibleSubMenu: false,
      };
    },
    computed: {
      ...mapGetters(['isAppContext']),
      url() {
        return urls['kolibri:kolibri.plugins.device:device_management']();
      },
      routes() {
        return {
          channels: {
            text: this.coreString('channelsLabel'),
            route: this.generateNavRoute(DevicePageNames.MANAGE_CONTENT_PAGE),
          },
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
      optionStyle() {
        return {
          color: this.$themeTokens.text,
          textDecoration: 'none',
          ':hover': {
            color: this.$themeTokens.primaryDark,
            fontWeight: 'bold',
          },
          ':focus': this.$coreOutline,
        };
      },
      iconAfter() {
        if (this.isAppContext) {
          return this.visibleSubMenu ? 'chevronUp' : 'chevronDown';
        }
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
