<template>

  <core-modal
    :title="$tr('title')"
    @cancel="handleCancel"
  >
    <div>
      <p>{{ $tr('confirmationQuestion') }}</p>
      <p>{{ $tr('changesWillBeLost') }}</p>
    </div>

    <div class="modal-buttons">
      <k-button
        :primary="false"
        :raised="false"
        @click="handleCancel()"
        :text="$tr('cancel')"
        name="cancel"
      />
      <k-button
        :primary="true"
        :raised="true"
        @click="handleConfirm()"
        :text="$tr('reset')"
        name="reset"
      />

    </div>

  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    components: {
      coreModal,
      kButton,
    },
    methods: {
      handleConfirm() {
        this.$emit('click-confirm');
      },
      handleCancel() {
        this.$emit('click-cancel');
      },
    },
    $trNameSpace: 'confirmResetModal',
    $trs: {
      cancel: 'Cancel',
      changesWillBeLost: 'Your changes will be lost',
      confirmationQuestion: 'Reset your facility settings back to default?',
      reset: 'Reset',
      title: 'Reset settings to default',
    },
  };

</script>


<style lang="stylus" scoped>

  .modal-buttons
    text-align: right

</style>
