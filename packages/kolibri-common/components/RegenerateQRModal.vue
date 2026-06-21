<template>

  <KModal
    :title="regenerateQRConfirmTitle$()"
    :submitText="regenerateQR$()"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('confirm')"
    @cancel="$emit('cancel')"
  >
    <p>{{ regenerateQRConfirm$({ name: learnerName }) }}</p>
    <p
      class="warning-text"
      :style="{ color: $themeTokens.error }"
    >
      {{ regenerateQRWarning$() }}
    </p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';

  export default {
    name: 'RegenerateQRModal',
    components: {},
    mixins: [commonCoreStrings],
    setup() {
      const {
        regenerateQR$,
        regenerateQRConfirmTitle$,
        regenerateQRConfirm$,
        regenerateQRWarning$,
      } = qrLoginStrings;
      return {
        regenerateQR$,
        regenerateQRConfirmTitle$,
        regenerateQRConfirm$,
        regenerateQRWarning$,
      };
    },
    props: {
      learnerName: {
        type: String,
        required: true,
      },
    },
    emits: ['confirm', 'cancel'],
  };

</script>


<style lang="scss" scoped>

  .warning-text {
    margin-top: 8px;
    font-size: 14px;
  }

</style>
