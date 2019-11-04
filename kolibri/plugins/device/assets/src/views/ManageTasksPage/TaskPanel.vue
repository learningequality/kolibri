<template>

  <div class="task-panel">
    <div class="icon">
      <transition mode="out-in">
        <KIcon
          v-if="taskIsFailed"
          icon="helpNeeded"
          :style="{fill: $themeTokens.error}"
        />
        <KIcon
          v-else-if="taskIsCompleted"
          icon="done"
          :style="{fill: $themeTokens.success}"
        />
        <KCircularLoader
          v-else-if="taskIsRunning"
          :size="24"
          :stroke="5"
        />
        <KIcon
          v-else
          icon="inProgress"
          :style="{fill: $themeTokens.annotation}"
        />
      </transition>
    </div>

    <div class="details">
      <p class="details-status" :style="{color: $themeTokens.annotation}">
        {{ statusText }}
      </p>
      <h2 class="details-description">
        {{ descriptionText }}
      </h2>
      <div v-if="taskIsRunning" class="details-progress-bar">
        <KLinearLoader
          class="k-linear-loader"
          type="determinate"
          :delay="false"
          :progress="task.percentage * 100"
          :style="{backgroundColor: $themeTokens.fineLine}"
        />
        <span class="details-percentage">
          {{ percentageText }}
        </span>
      </div>
      <p v-if="sizeText" class="details-size">
        {{ sizeText }}
      </p>
      <p class="details-startedby" :style="{color: $themeTokens.annotation}">
        {{ startedByText }}
      </p>
    </div>

    <div class="buttons" :class="{'button-lift': taskIsRunning}">
      <KButton
        :text="buttonLabel"
        :primary="true"
        appearance="flat-button"
        @click="handleClick"
      />
    </div>
  </div>

</template>


<script>

  // Displays a single Task and its metadata, and provides buttons
  // to cancel or clear it.

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';

  const typeToTrMap = {
    REMOTECHANNELIMPORT: 'generatingChannelListing',
    DISKCHANNELIMPORT: 'generatingChannelListing',
    REMOTECONTENTIMPORT: 'importingChannel',
    DISKCONTENTIMPORT: 'importingChannel',
    DISKEXPORT: 'exportingChannel',
    DELETECHANNEL: 'deletingChannel',
    UPDATECHANNEL: 'updatingChannelVersion',
  };

  const statusToTrMap = {
    COMPLETED: 'statusComplete',
    FAILED: 'statusFailed',
    RUNNING: 'statusInProgress',
    QUEUED: 'statusInQueue',
    CANCELED: 'statusCanceled',
    CANCELING: 'statusCanceling',
  };

  export default {
    name: 'TaskPanel',
    components: {},
    mixins: [commonCoreStrings],
    props: {
      task: {
        type: Object,
        required: true,
        default() {
          return {};
        },
      },
    },
    computed: {
      buttonLabel() {
        if (this.taskIsCompleted) {
          return this.coreString('clearAction');
        }
        return this.coreString('cancelAction');
      },
      percentageText() {
        return (this.task.percentage * 100).toFixed(2) + '%';
      },
      taskIsRunning() {
        return this.task.status === 'RUNNING';
      },
      taskIsCompleted() {
        return this.task.status === 'COMPLETED';
      },
      taskIsFailed() {
        return this.task.status === 'FAILED' || this.task.status === 'CANCELED';
      },
      descriptionText() {
        const trName = typeToTrMap[this.task.type];
        return this.$tr(trName, {
          channelName: this.task.channel_name || this.$tr('unknownChannelName'),
        });
      },
      sizeText() {
        const { file_size, total_resources } = this.task;
        if (file_size && total_resources) {
          return this.$tr('numResourcesAndSize', {
            numResources: total_resources,
            bytesText: bytesForHumans(file_size),
          });
        }
        return '';
      },
      statusText() {
        const trName = statusToTrMap[this.task.status];
        return this.$tr(trName);
      },
      startedByText() {
        return this.$tr('startedByUser', {
          user: this.task.started_by_username || this.$tr('unknownUsername'),
        });
      },
    },
    methods: {
      handleClick() {
        if (this.taskIsCompleted || this.taskIsFailed) {
          this.$emit('clickclear');
        } else {
          this.$emit('clickcancel');
        }
      },
    },
    $trs: {
      startedByUser: `Started by '{user}'`,
      numResourcesAndSize: '{numResources} resources ({bytesText})',
      statusInProgress: 'In-progress',
      statusInQueue: 'Waiting',
      statusComplete: 'Complete',
      statusFailed: 'Failed',
      statusCanceled: 'Canceled',
      statusCanceling: 'Canceling',
      importingChannel: 'Importing {channelName}',
      exportingChannel: 'Exporting {channelName}',
      deletingChannel: 'Deleting {channelName}',
      generatingChannelListing: 'Generating channel listing - {channelName}',
      updatingChannelVersion: 'Updating channel version - { channelName }',
      // Catch-all strings if the channel or username doesn't get attached to Task
      unknownUsername: 'Unknown user',
      unknownChannelName: '(Channel name unavailable)',
    },
  };

</script>


<style lang="scss" scoped>

  $fs0: 12px;
  $fs1: 14px;
  $fs2: 16px;

  p,
  h2 {
    margin: 8px 0;
  }

  .icon {
    padding: 0 16px;
  }

  .icon svg {
    width: 24px;
    height: 24px;
  }

  .task-panel {
    display: flex;
    align-items: center;
  }

  .details {
    flex-grow: 1;
    padding: 16px;
  }

  .details-description {
    font-size: $fs2;
  }

  .details-progress-bar {
    display: flex;
    align-items: center;
    max-width: 450px;
    margin-bottom: 32px;
  }

  // CSS overrides for linear loader
  .k-linear-loader {
    height: 10px;

    /deep/ .ui-progress-linear-progress-bar {
      height: 100%;
    }
  }

  .details-percentage {
    margin-left: 16px;
    font-size: $fs1;
  }

  .details-status {
    font-size: $fs0;
  }

  .details-size {
    font-size: $fs1;
  }

  .details-startedby {
    font-size: $fs0;
  }

  .buttons-lift {
    // Lift button a little to align with progress bar
    margin-top: -24px;
  }

</style>
