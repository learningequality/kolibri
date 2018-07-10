<template>

  <core-menu-option
    :label="$tr('device')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="tablet_mac"
      category="hardware"
    />
  </core-menu-option>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import coreMenuOption from 'kolibri.coreVue.components.coreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'deviceManagementSideNavEntry',
    components: {
      coreMenuOption,
    },
    $trs: {
      device: 'Device',
    },
    computed: {
      url() {
        return urls['kolibri:devicemanagementplugin:device_management']();
      },
    },
    role: UserKinds.CAN_MANAGE_CONTENT,
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>


<style lang="scss" scoped></style>
