<template>

  <div>
    <core-snackbar
      v-if="disconnected"
      class="disconnected-snackbar"
      :text="$tr('disconnected', { remainingTime })"
      :actionText="$tr('tryNow')"
      :backdrop="true"
      @actionClicked="tryToReconnect"
      :key="$tr('tryNow')"
    />
    <core-snackbar
      v-if="tryingToReconnect"
      class="trying-to-reconnect-snackbar"
      :text="$tr('tryingToReconnect')"
      :backdrop="true"
      :key="$tr('tryingToReconnect')"
    />
    <core-snackbar
      v-if="successfullyReconnected"
      class="successfully-reconnected-snackbar"
      :text="$tr('successfullyReconnected')"
      :autoDismiss="true"
      :key="$tr('successfullyReconnected')"
    />
  </div>

</template>


<script>

  import coreSnackbar from 'kolibri.coreVue.components.coreSnackbar';
  import { connected, reconnectTime, currentSnackbar } from 'kolibri.coreVue.vuex.getters';
  import { tryToReconnect } from 'kolibri.coreVue.vuex.actions';
  import { ConnectionSnackbars } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'connectionSnackbars',
    components: {
      coreSnackbar,
    },
    data: () => ({
      timeToReconnect: 0,
      timer: null,
    }),
    $trs: {
      disconnected: 'Disconnected from server. Will try to reconnect in { remainingTime }',
      tryNow: 'Try now',
      tryingToReconnect: 'Trying to reconnect…',
      successfullyReconnected: 'Successfully reconnected!',
    },
    computed: {
      disconnected() {
        return !this.connected && this.currentSnackbar === ConnectionSnackbars.DISCONNECTED;
      },
      tryingToReconnect() {
        return !this.connected && this.currentSnackbar === ConnectionSnackbars.TRYING_TO_RECONNECT;
      },
      successfullyReconnected() {
        return (
          this.connected && this.currentSnackbar === ConnectionSnackbars.SUCCESSFULLY_RECONNECTED
        );
      },
      remainingTime() {
        return new Date(1000 * this.timeToReconnect).toISOString().substr(14, 5);
      },
    },
    watch: {
      currentSnackbar: 'setTimer',
      connected: 'setTimer',
    },
    mounted() {
      this.setTimer();
    },
    beforeDestroy() {
      this.clearTimer();
    },
    methods: {
      clearTimer() {
        if (this.timer !== null) {
          clearInterval(this.timer);
          this.timer = null;
        }
      },
      setTimer() {
        this.clearTimer();
        if (this.reconnectTime) {
          this.timeToReconnect = this.reconnectTime;
          this.timer = setInterval(() => {
            this.timeToReconnect = this.timeToReconnect - 1;
          }, 1000);
        }
      },
    },
    vuex: {
      getters: {
        connected,
        reconnectTime: reconnectTime,
        currentSnackbar,
      },
      actions: {
        tryToReconnect,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
