<template>

  <KModal
    :title="title"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p v-if="channelTitle">
      {{ $tr('confirmationQuestion', { channelTitle }) }}
    </p>
    <p v-else-if="numberOfChannels === 1">
      {{ $tr('confirmationQuestionOneChannel') }}
    </p>
    <p v-else>
      {{ $tr('confirmationQuestionMultipleChannels') }}
    </p>
    <p>{{ coreString('cannotUndoActionWarning') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'DeleteChannelModal',
    mixins: [commonCoreStrings],
    props: {
      channelTitle: {
        type: String,
        default: null,
      },
      numberOfChannels: {
        type: Number,
        default: 1,
      },
    },
    computed: {
      title() {
        // Assume that if a channel title is provided, we're at the
        // ManageContentPage. Otherwise, assume we're at DeleteExportChannelsPage
        if (this.numberOfChannels === 1) {
          return this.$tr('titleSingleChannel');
        }
        return this.$tr('titleMultipleChannels');
      },
    },
    $trs: {
      confirmationQuestion: {
        message: `Are you sure you want to delete '{channelTitle}' from your device?`,
        context: 'Confirmation of delete message.',
      },
      confirmationQuestionOneChannel: {
        message: 'Are you sure you want to delete this channel from your device?',
        context: 'A confirmation that appears when a user tries to delete a single channel.',
      },
      confirmationQuestionMultipleChannels: {
        message: 'Are you sure you want to delete these channels from your device?',
        context: 'A confirmation that appears when a user tries to delete multiple channels',
      },
      titleSingleChannel: {
        message: 'Delete channel',
        context: 'Title of window that displays when a user tries to delete a single channel.',
      },
      titleMultipleChannels: {
        message: 'Delete channels',
        context: 'Title of window that displays when a user tries to delete a channel or channels.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
