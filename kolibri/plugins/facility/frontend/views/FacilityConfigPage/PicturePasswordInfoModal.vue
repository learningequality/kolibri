<template>

  <KModal
    :title="picturePasswordInfoTitle$()"
    :submitText="coreString('closeAction')"
    @submit="$emit('close')"
    @cancel="$emit('close')"
  >
    <p>{{ picturePasswordInfoBody$() }}</p>
  </KModal>

</template>


<script>

  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';

  export default {
    name: 'PicturePasswordInfoModal',
    setup() {
      const { picturePasswordInfoLabel$, picturePasswordInfoTitle$, picturePasswordInfoBody$ } =
        picturePasswordStrings;

      return {
        coreString,
        picturePasswordInfoLabel$,
        picturePasswordInfoTitle$,
        picturePasswordInfoBody$,
      };
    },
  };

</script>
