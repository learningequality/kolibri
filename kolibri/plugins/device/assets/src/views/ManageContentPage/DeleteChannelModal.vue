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
    <p v-else>
      {{ $tr('confirmationQuestionMultiChannels') }}
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
      confirmationQuestionMultiChannels:
        'Are you sure you want to delete these channels from your device?',
      title: 'Delete channel',
      titleMultipleChannels: 'Delete channels',
    },
  };

</script>


<style lang="scss" scoped></style>
