<template>

  <KModal
    :title="$tr('title')"
    :cancelText="coreString('cancelAction')"
    :submitText="submitText"
    @cancel="$emit('cancel')"
    @submit="$emit('submit')"
  >
    <p v-if="channelName">
      {{ $tr('updateChannelExplanationWithName', {
        channelName: newChannel.name,
        version: newChannel.version }) }}
    </p>
    <p v-else>
      {{ $tr('updateChannelExplanation') }}
    </p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'UpdateChannelModal',
    mixins: [commonCoreStrings],
    props: {
      newChannel: {
        type: Object,
        required: false,
      },
    },
    computed: {
      submitText() {
        return this.newChannel
          ? this.coreString('updateAction')
          : this.coreString('continueAction');
      },
    },
    $trs: {
      title: 'Update channel',
      updateChannelExplanation:
        'A channel you selected for import will be automatically updated to the latest version. Do you wish to continue?',
      updateChannelExplanationWithName: `Are you sure you want to update '{channelName}' to version {versionNumber}`,
    },
  };

</script>


<style lang="scss" scoped></style>
