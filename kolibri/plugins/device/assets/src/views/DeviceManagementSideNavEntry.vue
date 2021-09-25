<template>

  <CoreMenuOption
    :label="$tr('device')"
    :link="url"
    icon="device"
  />

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'DeviceManagementSideNavEntry',
    components: {
      CoreMenuOption,
    },
    $trs: {
      device: {
        message: 'Device',
        context:
          'The device is the physical or virtual machine that has the Kolibri server installed on it.',
      },
    },
    computed: {
      url() {
        return urls['kolibri:kolibri.plugins.device:device_management']();
      },
    },
    role: UserKinds.CAN_MANAGE_CONTENT,
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>
