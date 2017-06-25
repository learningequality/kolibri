<template>

  <modal
    :title="$tr('title')"
    @cancel="handleClickCancel()"
  >
    <div>
      <p class="action-description">
        {{ $tr('deleteActionDescription') }}: {{ channelTitle }}
      </p>
      <p>{{ $tr('restorationInstructions') }}</p>
      <p>{{ $tr('confirmationQuestion') }}</p>
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

  import modal from 'kolibri.coreVue.components.coreModal';
  import uiButton from 'keen-ui/src/UiButton';
  export default {
    components: {
      modal,
      uiButton,
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
      confirmationQuestion: 'Are you sure you want to do this?',
      restorationInstructions:
        'To restore this channel, you will need to re-import it from the internet or a storage device',
      title: 'Delete channel',
      cancelButtonLabel: 'Cancel',
      confirmButtonLabel: 'Confirm',
    },
  };

</script>


<style lang="stylus" scoped>

  .action-description
    font-weight: bold

  .buttons
    text-align: right

</style>
