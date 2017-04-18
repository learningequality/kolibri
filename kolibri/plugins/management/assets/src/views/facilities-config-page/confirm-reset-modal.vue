<template>

  <core-modal
    :title="$tr('title')"
    @cancel="handleCancel"
  >
    <div class="tc">
      <p>{{ $tr('confirmationQuestion') }}</p>
      <p>{{ $tr('changesWillBeLost') }}</p>
    </div>

    <div>
      <ui-button
        class="w-48 fl"
        :ariaLabel="$tr('cancel')"
        @click="handleCancel()"
        name="cancel"
      >
        {{ $tr('cancel') }}
      </ui-button>
      <ui-button
        class="w-48 fr"
        :ariaLabel="$tr('reset')"
        @click="handleConfirm()"
        color="primary"
        name="reset"
      >
        {{ $tr('reset') }}
      </ui-button>

    </div>

  </core-modal>

</template>


<script>

  module.exports = {
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'ui-button': require('keen-ui/src/UiButton'),
    },
    methods: {
      handleConfirm() {
        this.$emit('click-confirm');
      },
      handleCancel() {
        this.$emit('click-cancel');
      }
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

  .tc
    text-align: center

  .fl
    float: left

  .fr
    float: right

  .w-48
    width: 48%

</style>
