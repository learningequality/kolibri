<template>

  <div class="TaskStatus">
    <!-- Progress bar element, status label -->
    <div class="Bar dtc">
      <div class="Bar__statusMsg">{{ title }} &mdash; {{ subTitle }}</div>
      <progress class="Bar_bar" max="1" :value="percentage"></progress>
    </div>

    <!-- Bytes downloaded, time remaining -->
    <div class="Stats dtc">
      <span class="Stats__percentage dib">
        {{ percentage * 100 | round }}%
      </span>
      <span class="Stats__time dib">
        <template v-if="statusFailed">{{ $tr('failedMsg') }}</template>
        <template v-else>
          {{ timeLeft | timeify }}
        </template>
      </span>
    </div>

    <!-- Buttons -->
    <div class="Controls dtc">
      <button @click="handleClearTask()">{{ buttonMessage }}</button>
    </div>
    <!-- <h1>{{ title }}</h1>
    <h2>{{ subTitle }}</h2>
    <p v-if="statusFailed">{{ $tr('failedMsg') }}</p>
    <icon-button class="buttons" @click="handleClearTask" :text="buttonMessage"/> -->
  </div>

</template>


<script>
  const actions = require('../../state/actions');
  const logging = require('kolibri.lib.logging');
  const constants = require('../../constants');
  const round = require('lodash/round');

  const { TaskTypes, TaskStatuses } = constants;

  module.exports = {
    $trNameSpace: 'contentPage',
    $trs: {
      buttonClose: 'Close',
      buttonCancel: 'Cancel',
      failed: 'Please try again',
      failedMsg: 'The transfer did not succeed. Restart it to resume transferring the remaining content',
      completed: `Finished!`,
      loading: 'Please wait…',
      remoteImport: 'Importing from curation server',
      localImport: 'Importing from local drive',
      localExport: 'Exporting to local drive',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    filters: {
      round(num) {
        return Math.round(num);
      },
      timeify(num) {
        const ONE_HOUR = 3600;
        const ONE_MINUTE = 60;
        if (num < 0) {
          return 'Calculating...';
        }
        if (num > ONE_HOUR) {
          return `${round(num / ONE_HOUR, 1)} hours`;
        }
        if (num > ONE_MINUTE) {
          return `${Math.round(num / ONE_MINUTE)} minutes`;
        }
        return `${Math.round(num)} seconds`;
      }
    },
    data: () => ({
      averageSpeed: null, // percentage/second
      lastTick: Date.now(),
      timeLeft: null,
      updateCounter: 0,
    }),
    computed: {
      speedIsStable() {
        return this.updateCounter > 10;
      },
      timeLeft() {
        // wait a certain number of updates to stabilize a little
        // in testing, speeds are so random, that it takes a lot of samples
        if (!this.speedIsStable) {
          return -1;
        }
        return ((1 - this.percentage) / this.averageSpeed); // seconds
      },
      buttonMessage() {
        if (this.statusFailed || this.statusSuccess) {
          return this.$tr('buttonClose');
        }
        return this.$tr('buttonCancel');
      },
      statusFailed() {
        return this.status === TaskStatuses.FAILED;
      },
      statusSuccess() {
        return this.status === TaskStatuses.SUCCESS;
      },
      title() {
        switch (this.type) {
          case TaskTypes.REMOTE_IMPORT:
            return this.$tr('remoteImport');
          case TaskTypes.LOCAL_IMPORT:
            return this.$tr('localImport');
          case TaskTypes.LOCAL_EXPORT:
            return this.$tr('localExport');
          default:
            logging.error(`unknown task type: ${this.type}`);
            return undefined;
        }
      },
      subTitle() {
        if (this.statusFailed) {
          return this.$tr('failed');
        } else if (this.statusSuccess) {
          return this.$tr('completed');
        }
        return this.$tr('loading');
      },
    },
    methods: {
      handleClearTask() {
        // send notification
        this.clearTask(this.id);
        this.updateCounter = 0;
      },
    },
    watch: {
      percentage(val, oldVal) {
        const now = Date.now();
        const lastSpeed = (val - oldVal) / ((now - this.lastTick) / 1000);
        if (!this.averageSpeed) {
          this.averageSpeed = lastSpeed;
        } else {
          // exponential smoothing. since, updates are lightly weighted, this
          // is very sensitive to initial conditions and will take a long time
          // to correct bad initial values
          const SF = 0.005;
          this.averageSpeed = (SF * lastSpeed) + ((1 - SF) * this.averageSpeed);
          this.updateCounter += 1;
        }
        this.lastTick = now;
      },
    },
    props: {
      type: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        required: true,
      },
      percentage: {
        type: Number,
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
    },
    vuex: {
      actions: {
        clearTask: actions.clearTask,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .dtc
    display: table-cell

  .TaskStatus
    display: table
    font-size: 0.65rem
    width: 100%

  .Stats
    vertical-align: middle

  .Bar
    width: 50%
    position: relative
    padding-right: 10px
    &__bar
    &__statusMsg
      position: absolute
      top: -0.75rem

  .Controls
    float: right

  .buttons
    margin: 10px
    text-align: center

  .task
    text-align: center

  progress
    width: 100%
    height: 16px
    -webkit-appearance: none
    -moz-appearance: none
    appearance: none
    border: none
    color: $core-action-normal

  progress[value]::-webkit-progress-bar
    border-radius: 50px

  progress[value]::-webkit-progress-value
    background-color: $core-action-normal
    border-radius: 50px

</style>
