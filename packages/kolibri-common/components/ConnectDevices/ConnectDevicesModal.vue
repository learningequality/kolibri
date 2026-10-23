<template>

  <KModal
    :title="title$()"
    :cancelText="coreString('closeAction')"
    @cancel="$emit('cancel')"
  >
    <ConnectDevices />
  </KModal>

</template>


<script>

  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { connectDevicesStrings } from 'kolibri-common/strings/connectDevicesStrings';
  import ConnectDevices from './index.vue';

  export default {
    name: 'ConnectDevicesModal',
    components: {
      ConnectDevices,
    },
    setup() {
      return {
        coreString,
        title$: connectDevicesStrings.title$,
      };
    },
  };

</script>
