<template>

  <CoreMenuOption
    :label="coreString('facilityLabel')"
    :link="url"
    icon="facility"
  />

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'FacilityManagementSideNavEntry',
    mixins: [commonCoreStrings],
    components: {
      CoreMenuOption,
    },
    $trs: {},
    computed: {
      url() {
        return urls['kolibri:kolibri.plugins.facility:facility_management']();
      },
    },
    role: UserKinds.ADMIN,
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>
