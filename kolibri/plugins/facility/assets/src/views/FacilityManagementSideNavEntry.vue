<template>

  <div>
    <CoreMenuOption
      :label="coreString('facilityLabel')"
      :link="isAppContext ? null : url"
      :iconAfter="iconAfter"
      icon="facility"
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
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import { mapGetters } from 'vuex';
  import generateSideNavRoute from '../appNavigationRoutes.js';
  import { PageNames as FacilityPageNames } from '../constants';

  const component = {
    name: 'FacilityManagementSideNavEntry',
    mixins: [commonCoreStrings],
    components: {
      CoreMenuOption,
    },
    data() {
      return {
        visibleSubMenu: false,
      };
    },
    computed: {
      ...mapGetters(['isAppContext']),
      url() {
        return urls['kolibri:kolibri.plugins.facility:facility_management']();
      },
      routes() {
        return {
          facilityClasses: {
            text: this.coreString('classesLabel'),
            route: this.generateSideNavRoute(FacilityPageNames.CLASS_MGMT_PAGE),
          },
          facilityUsers: {
            text: this.coreString('usersLabel'),
            route: this.generateSideNavRoute(FacilityPageNames.USER_MGMT_PAGE),
          },
          facilitySettings: {
            text: this.$tr('settingsLabel'),
            route: this.generateSideNavRoute(FacilityPageNames.FACILITY_CONFIG_PAGE),
          },
          facilityData: {
            text: this.$tr('data'),
            route: this.generateSideNavRoute(FacilityPageNames.DATA_EXPORT_PAGE),
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
      generateSideNavRoute(route) {
        return generateSideNavRoute(this.url, route);
      },
    },
    role: UserKinds.ADMIN,
    priority: 10,
    $trs: {
      data: {
        message: 'Data',
        context: "Title of tab in 'Facility' section.",
      },
      settingsLabel: {
        message: 'Settings',
        context: "Title of tab in 'Facility' section.",
      },
    },
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
    text-decoration: none;
  }

</style>
