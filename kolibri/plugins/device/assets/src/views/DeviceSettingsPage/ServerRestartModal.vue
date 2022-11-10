<template>

  <KModal
    :title="$tr('serverRestart')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('serverRestartDecription', { changedSetting: changedSetting }) }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ServerRestartModal',
    mixins: [commonCoreStrings],
    props: {
      changedSetting: {
        type: String,
        required: true,
      },
    },
    $trs: {
      serverRestart: {
        message: 'Server restart',
        context: 'Prompt for removing a storage location.',
      },
      serverRestartDecription: {
        message:
          '{changedSetting} restart this server. Anyone using Kolibri on this server right now will temporarily be unable to use it.',
        context: 'Description for restarting the server.',
      },
    },
  };

</script>
