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
      <div v-for="(nestedObject, key) in facilityRoutes" :key="key" class="link-container">
        <a
          :href="nestedObject.route"
          class="link"
          :class="$computedClass(subpathStyles(nestedObject.route))"
          @click="handleNav(nestedObject.route)"
        >
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
  import { generateNavRoute } from '../../../../../core/assets/src/utils/generateNavRoutes';
  import baseRoutes from '../baseRoutes';
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
    mounted() {
      this.submenuShouldBeOpen();
    },
    computed: {
      ...mapGetters(['isAppContext']),
      url() {
        return urls['kolibri:kolibri.plugins.facility:facility_management']();
      },
      facilityRoutes() {
        return {
          facilityClasses: {
            text: this.coreString('classesLabel'),
            route: this.generateNavRoute(FacilityPageNames.CLASS_MGMT_PAGE),
          },
          facilityUsers: {
            text: this.coreString('usersLabel'),
            route: this.generateNavRoute(FacilityPageNames.USER_MGMT_PAGE),
          },
          facilitySettings: {
            text: this.$tr('settingsLabel'),
            route: this.generateNavRoute(FacilityPageNames.FACILITY_CONFIG_PAGE),
          },
          facilityData: {
            text: this.$tr('data'),
            route: this.generateNavRoute(FacilityPageNames.DATA_EXPORT_PAGE),
          },
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
        // if class id
        let params;
        if (this.$store.getters.currentFacilityId) {
          params = { facilityId: this.$store.getters.currentFacilityId };
          return generateNavRoute(this.url, route, baseRoutes, params);
        }
      },
      toggleAndroidMenu() {
        this.$emit('toggleAndroidMenu');
      },
      isActiveLink(route) {
        return route.includes(this.$router.currentRoute.path);
      },
      submenuShouldBeOpen() {
        // which plugin are we currently in?
        this.visibleSubMenu = window.location.pathname.includes(this.url);
      },
      subpathStyles(route) {
        if (this.isActiveLink(route)) {
          return {
            color: this.$themeTokens.primaryDark,
            fontWeight: 'bold',
            textDecoration: 'none',
          };
        }
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
      handleNav(route) {
        this.isActiveLink(route) ? this.toggleAndroidMenu() : null;
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
