<template>

  <CoreMenuOption
    :label="coreString('facilityLabel')"
    icon="facility"
    :subRoutes="facilityRoutes"
  />

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import { generateNavRoute } from '../../../../../core/assets/src/utils/generateNavRoutes';
  import baseRoutes from '../baseRoutes';
  import { PageNames as FacilityPageNames } from '../constants';

  const component = {
    name: 'FacilityManagementSideNavEntry',
    mixins: [commonCoreStrings],
    components: {
      CoreMenuOption,
    },
    computed: {
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
            text: this.coreString('settingsLabel'),
            route: this.generateNavRoute(FacilityPageNames.FACILITY_CONFIG_PAGE),
          },
          facilityData: {
            text: this.coreString('dataLabel'),
            route: this.generateNavRoute(FacilityPageNames.DATA_EXPORT_PAGE),
          },
        };
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
    },
    role: UserKinds.ADMIN,
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
    text-decoration: none;
  }

</style>
