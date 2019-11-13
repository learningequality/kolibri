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
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'DeleteChannelModal',
    mixins: [commonCoreStrings],
    props: {
      channelTitle: {
        type: String,
        required: false,
      },
      numberOfChannels: {
        type: Number,
        required: false,
      },
    },
    computed: {
      title() {
        // Assume that if a channel title is provided, we're at the
        // ManageContentPage. Otherwise, assume we're at DeleteExportChannelsPage
        if (this.channelTitle) {
          return this.$tr('title');
        }
        return this.$tr('titleMultipleChannels');
      },
    },
    $trs: {
      confirmationQuestion: `Are you sure you want to delete '{ channelTitle }' from your device?`,
      confirmationQuestionOneChannel:
        'Are you sure you want to delete this channel from your device?',
      confirmationQuestionMultipleChannels:
        'Are you sure you want to delete these channels from your device?',
      title: 'Delete channel',
      titleMultipleChannels: 'Delete channels',
    },
  };

</script>


<style lang="scss" scoped></style>
