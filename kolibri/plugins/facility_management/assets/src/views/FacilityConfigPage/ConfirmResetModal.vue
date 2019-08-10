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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ConfirmResetModal',
    mixins: [commonCoreStrings],
    $trs: {
      confirmationQuestion: 'Are you sure you want to reset your settings?',
      reconfirmation: 'Any custom changes will be lost.',
      reset: 'Reset',
      title: 'Reset to defaults',
    },
  };

</script>


<style lang="scss" scoped></style>
