<template>

  <KModal
    :title="$tr('title')"
    :submitText="$tr('reset')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ $tr('confirmationQuestion') }}</p>
      <p>{{ $tr('reconfirmation') }}</p>
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'ConfirmResetModal',
    mixins: [commonCoreStrings],
    $trs: {
      confirmationQuestion: {
        message: 'Are you sure you want to reset your settings?',
        context:
          "Confirmation message on the 'Reset to defaults' window accessed via the Facility > Settings page.",
      },
      reconfirmation: {
        message:
          'Your device management PIN will not be affected, but any other changes made to the facility settings will be lost.',
        context:
          "Description on the 'Reset to defaults' window accessed via the Facility > Settings page.",
      },
      reset: {
        message: 'Reset',
        context:
          "Button on the the 'Reset to defaults' window accessed via the Facility > Settings page.\n\nUsers would use this button to reset the Facility settings to default.",
      },
      title: {
        message: 'Reset to defaults',
        context:
          "Title of the 'Reset to defaults' window accessed via the Facility > Settings page.\n",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
