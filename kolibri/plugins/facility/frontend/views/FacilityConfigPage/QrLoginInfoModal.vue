<template>

  <KModal
    :title="qrLoginInfoTitle$()"
    :submitText="coreString('closeAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ qrLoginInfoDescription$() }}</p>
  </KModal>

</template>


<script>

  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';

  export default {
    name: 'QrLoginInfoModal',
    setup() {
      const { qrLoginInfoTitle$, qrLoginInfoDescription$ } = qrLoginStrings;

      return {
        coreString,
        qrLoginInfoTitle$,
        qrLoginInfoDescription$,
      };
    },
  };

</script>
