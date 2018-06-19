<template>

  <k-modal
    :title="$tr('title')"
    :submitText="$tr('reset')"
    :cancelText="$tr('cancel')"
    @submit="handleConfirm"
    @cancel="handleCancel"
  >
    <div>
      <p>{{ $tr('confirmationQuestion') }}</p>
      <p>{{ $tr('changesWillBeLost') }}</p>
    </div>
  </k-modal>

</template>


<script>

  import kModal from 'kolibri.coreVue.components.kModal';

  export default {
    name: 'confirmResetModal',
    components: {
      kModal,
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
      changesWillBeLost: 'Your changes will be lost',
      confirmationQuestion: 'Reset your facility settings back to default?',
      reset: 'Reset',
      title: 'Reset settings to default',
    },
  };

</script>


<style lang="stylus" scoped></style>
