<template>

  <KModal
    :title="$tr('title')"
    :submitText="$tr('reset')"
    :cancelText="$tr('cancel')"
    @submit="handleConfirm"
    @cancel="handleCancel"
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
    methods: {
      handleConfirm() {
        this.$emit('click-confirm');
      },
      handleCancel() {
        this.$emit('click-cancel');
      },
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
