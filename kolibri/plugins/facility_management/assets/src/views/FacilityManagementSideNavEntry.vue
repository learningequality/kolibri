<template>

  <CoreMenuOption
    :label="$tr('facility')"
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
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'FacilityManagementSideNavEntry',
    components: {
      CoreMenuOption,
    },
    $trs: {
      facility: 'Facility',
    },
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
