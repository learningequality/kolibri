<template>

  <KModal
    :title="$tr('title')"
    :submitText="$tr('reset')"
    :cancelText="$tr('cancel')"
  >
    <div>
      <p>{{ $tr('confirmationQuestion') }}</p>
      <p>{{ $tr('reconfirmation') }}</p>
    </div>
  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'ConfirmResetModal',
    components: {
      KModal,
    },
    $trs: {
      cancel: 'Cancel',
      confirmationQuestion: 'Are you sure you want to reset your settings?',
      reconfirmation: 'Any custom changes will be lost.',
      reset: 'Reset',
      title: 'Reset to defaults',
    },
  };

</script>


<style lang="scss" scoped></style>
