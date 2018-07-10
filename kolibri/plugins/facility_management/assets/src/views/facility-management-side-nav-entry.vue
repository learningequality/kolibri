<template>

  <core-menu-option
    :label="$tr('facility')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="settings_input_antenna"
      category="action"
    />
  </core-menu-option>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import coreMenuOption from 'kolibri.coreVue.components.coreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'facilityManagementSideNavEntry',
    components: {
      coreMenuOption,
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


<style lang="scss" scoped></style>
