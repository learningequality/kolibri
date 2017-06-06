<template>

  <modal
    :title="$tr('title')"
    @cancel="handleClickCancel()"
  >
    <div>
      <p>{{ $tr('deleteActionDescription') }}: {{ channelTitle }}</p>
      <p>{{ $tr('confirmationQuestion') }}</p>
      <p>{{ $tr('restorationInstructions') }}</p>
    </div>

    <div class="buttons">
      <ui-button
        type="secondary"
        @click="handleClickCancel()"
      >
        {{ $tr('cancelButtonLabel') }}
      </ui-button>

      <ui-button
        type="primary"
        color="primary"
        @click="handleClickConfirm()"
      >
        {{ $tr('confirmButtonLabel') }}
      </ui-button>
    </div>

  </modal>

</template>


<script>

  module.exports = {
    components: {
      'modal': require('kolibri.coreVue.components.coreModal'),
      'ui-button': require('keen-ui/src/UiButton'),
    },
    props: {
      channelTitle: {
        type: String,
        required: true,
      },
    },
    methods: {
      handleClickCancel() {
        this.$emit('cancel');
      },
      handleClickConfirm() {
        this.$emit('confirm');
      },
    },
    $trNameSpace: 'deleteChannelModal',
    $trs: {
      deleteActionDescription: 'This channel will be deleted',
      confirmationQuestion: 'Are you sure?',
      restorationInstructions: 'To restore this channel, you will need to re-import it from the internet or a storage device',
      title: 'Delete channel',
      cancelButtonLabel: 'Cancel',
      confirmButtonLabel: 'Confirm',
    },
  };

</script>


<style lang="stylus" scoped>

  .buttons
    text-align: right

</style>
