<template>

  <core-modal
    :title="$tr('title')"
    @cancel="handleCancel"
  >
    <div>
      <p>{{ $tr('confirmationQuestion') }}</p>
      <p>{{ $tr('changesWillBeLost') }}</p>
    </div>

    <div class="core-modal-buttons">
      <k-button
        :primary="false"
        appearance="flat-button"
        @click="handleCancel()"
        :text="$tr('cancel')"
        name="cancel"
      />
      <k-button
        :primary="true"
        appearance="raised-button"
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
    name: 'confirmResetModal',
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
