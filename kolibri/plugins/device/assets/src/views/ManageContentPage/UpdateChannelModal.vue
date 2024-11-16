<template>

  <KModal
    :title="$tr('title')"
    :cancelText="coreString('cancelAction')"
    :submitText="submitText"
    @cancel="$emit('cancel')"
    @submit="$emit('submit')"
  >
    <p v-if="channelName">
      {{
        $tr('updateChannelExplanationWithName', {
          channelName: newChannel.name,
          version: newChannel.version,
        })
      }}
    </p>
    <p v-else>
      {{ $tr('updateChannelExplanation') }}
    </p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'UpdateChannelModal',
    mixins: [commonCoreStrings],
    props: {
      newChannel: {
        type: Object,
        default: null,
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
      title: {
        message: 'Update channel',
        context:
          'Public channels on Kolibri Studio are periodically updated from their original sources. Private and unlisted channels on a local Kolibri device may also have changed since they were first imported.\n\nThis section is where the user would update these channels.',
      },
      updateChannelExplanation: {
        message:
          'A channel you selected for import will be automatically updated to the latest version. Do you wish to continue?',
        context: 'Explanation message when a user updates a channel to a new version.',
      },
      updateChannelExplanationWithName: {
        message: `Are you sure you want to update '{channelName}' to version {versionNumber}`,
        context: 'Confirmation message before an admin updates a channel to a new version.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
