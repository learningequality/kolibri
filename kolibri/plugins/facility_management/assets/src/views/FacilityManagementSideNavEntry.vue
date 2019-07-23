<template>

  <CoreMenuOption
    :label="coreString('facilityLabel')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="settings_input_antenna"
      category="action"
    />
  </CoreMenuOption>

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
        return urls['kolibri:facilitymanagementplugin:facility_management']();
      },
    },
    role: UserKinds.ADMIN,
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>
