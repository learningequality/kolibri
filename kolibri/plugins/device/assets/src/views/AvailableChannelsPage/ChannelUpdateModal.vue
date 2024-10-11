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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'ChannelUpdateModal',
    mixins: [commonCoreStrings],
    $trs: {
      title: {
        message: 'Channel update',
        context:
          'Title of window that indicates some channels will be updated during the import process.',
      },
      channelUpdateExplanation: {
        message:
          'Some channels you selected for import will be automatically updated to the latest version. Do you wish to continue?',
        context: 'Description of channel update message.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
