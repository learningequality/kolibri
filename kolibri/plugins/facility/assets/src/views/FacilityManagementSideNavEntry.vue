<template>

  <CoreMenuOption
    :label="coreString('facilityLabel')"
    icon="facility"
    :subRoutes="facilityRoutes"
    :link="url"
  />

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import baseRoutes from '../baseRoutes';

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
        return [
          {
            label: this.coreString('classesLabel'),
            route: baseRoutes.classes.path,
          },
          {
            label: this.coreString('usersLabel'),
            route: baseRoutes.users.path,
          },
          {
            label: this.coreString('settingsLabel'),
            route: baseRoutes.settings.path,
          },
          {
            label: this.coreString('dataLabel'),
            route: baseRoutes.data.path,
          },
        ];
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
