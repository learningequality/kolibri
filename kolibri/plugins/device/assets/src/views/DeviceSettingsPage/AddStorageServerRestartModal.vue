<template>

  <KModal
    :title="$tr('serverRestart')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('serverRestartDescription') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'AddStorageServerRestartModal',
    mixins: [commonCoreStrings],
    $trs: {
      serverRestart: {
        message: 'Server restart for new storage location',
        context: 'Prompt for changing the primary storage location.',
      },
      serverRestartDescription: {
        message:
          'Server needs to restart to add a new storage location. Anyone using Kolibri on this server will temporarily be unable to access it.',
        context: 'Description of primary storage location change message.',
      },
    },
  };

</script>
