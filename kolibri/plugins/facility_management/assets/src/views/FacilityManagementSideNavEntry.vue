<template>

  <CoreMenuOption
    :label="coreCommon$tr('facilityLabel')"
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
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'FacilityManagementSideNavEntry',
    mixins: [coreStringsMixin],
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
