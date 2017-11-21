<template>

  <div>
    <core-snackbar
      v-if="disconnected"
      :text="$tr('disconnected')"
      :actionText="$tr('tryNow')"
      :backdrop="true"
      @actionClicked="tryToReconnect"
    />
    <core-snackbar
      v-if="tryingToReconnect"
      :text="$tr('tryingToReconnect')"
      :backdrop="true"
    />
    <core-snackbar
      v-if="successfullyReconnected"
      :text="$tr('successfullyReconnected')"
      :autoDismiss="true"
    />
  </div>

</template>


<script>

  import coreSnackbar from 'kolibri.coreVue.components.coreSnackbar';
  import { connected, reconnectTime, currentSnackbar } from 'kolibri.coreVue.vuex.getters';
  import { ConnectionStates } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'connectionSnackbars',
    components: {
      coreSnackbar,
    },
    $trs: {
      disconnected:
        'Disconnected from server. Will try to reconnect in { seconds, number, integer } { seconds, plural, one { second } other { seconds } }',
      tryNow: 'Try now',
      tryingToReconnect: 'Trying to reconnect...',
      successfullyReconnected: 'Successfully reconnected!',
      signedOut: 'You were automatically signed out due to inactivity',
      dismiss: 'Dismiss',
    },
    computed: {
      disconnected() {
        return this.currentSnackbar === ConnectionStates.DISCONNECTED;
      },
      tryingToReconnect() {
        return this.currentSnackbar === ConnectionStates.TRYING_TO_RECONNECT;
      },
      successfullyReconnected() {
        return this.currentSnackbar === ConnectionStates.SUCCESSFULLY_RECONNECTED;
      },
    },
    vuex: {
      getters: {
        connected,
        reconnectTime: reconnectTime || 0,
        currentSnackbar,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
