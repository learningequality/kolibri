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
      <icon-button
        :primary="false"
        :raised="false"
        @click="handleCancel()"
        :text="$tr('cancel')"
      />
      <icon-button
        :primary="true"
        :raised="true"
        @click="handleConfirm()"
        :text="$tr('reset')"
      />

    </div>

  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  export default {
    components: {
      coreModal,
      iconButton,
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
