<template>

  <KModal
    :title="$tr('title')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('channelUpdateExplanation') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ChannelUpdateModal',
    mixins: [commonCoreStrings],
    $trs: {
      title: 'Channel update',
      channelUpdateExplanation:
        'Some channels you selected for import will be automatically updated to the latest version. Do you wish to continue?',
    },
  };

</script>


<style lang="scss" scoped></style>
