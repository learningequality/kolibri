<template>

  <div class="task-panel" :class="{'task-panel-sm': windowIsSmall}">
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
      <div v-if="taskIsRunning || taskIsCanceling" class="details-progress-bar">
        <template v-if="taskIsRunning">
          <KLinearLoader
            class="k-linear-loader"
            type="determinate"
            :delay="false"
            :progress="task.percentage * 100"
            :style="{backgroundColor: $themeTokens.fineLine}"
          />
          <span class="details-percentage">
            {{ $tr('progressPercentage', { progress: task.percentage }) }}
          </span>
        </template>
        <template v-else-if="taskIsCanceling">
          <KLinearLoader
            class="k-linear-loader"
            type="indeterminate"
            :delay="false"
            :style="{backgroundColor: $themeTokens.fineLine}"
          />
        </template>
      </div>
      <template v-if="!taskIsCompleted && !taskIsCanceled">
        <p v-if="sizeText" class="details-size">
          {{ sizeText }}
        </p>
      </template>
      <template v-else>
        <p v-if="finishedSizeText" class="details-size">
          {{ finishedSizeText }}
        </p>
      </template>
      <p class="details-startedby" :style="{color: $themeTokens.annotation}">
        {{ startedByText }}
      </p>
    </div>

    <div class="buttons" :class="{'button-lift': taskIsRunning}">
      <KButton
        v-if="taskIsCancellable || taskIsClearable"
        :disabled="taskIsCanceling"
        :text="buttonLabel"
        appearance="flat-button"
        @click="handleClick"
      />
    </div>
  </div>

</template>


<script>

  // Displays a single Task and its metadata, and provides buttons
  // to cancel or clear it.

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';

  import { taskIsClearable, TaskStatuses, TaskTypes } from '../../constants';

  const typeToTrMap = {
    [TaskTypes.REMOTECONTENTIMPORT]: 'importChannelPartial',
    [TaskTypes.DISKCONTENTIMPORT]: 'importChannelPartial',
    [TaskTypes.REMOTEIMPORT]: 'importChannelWhole',
    [TaskTypes.DISKIMPORT]: 'importChannelWhole',
    [TaskTypes.DISKEXPORT]: 'exportChannelWhole',
    [TaskTypes.DISKCONTENTEXPORT]: 'exportChannelPartial',
    [TaskTypes.DELETECHANNEL]: 'deleteChannelWhole',
    [TaskTypes.DELETECONTENT]: 'deleteChannelPartial',
    [TaskTypes.UPDATECHANNEL]: 'updatingChannelVersion',
  };

  const typeToTrPrefixMap = {
    [TaskTypes.REMOTECONTENTIMPORT]: 'import',
    [TaskTypes.DISKCONTENTIMPORT]: 'import',
    [TaskTypes.UPDATECHANNEL]: 'import',
    [TaskTypes.REMOTEIMPORT]: 'import',
    [TaskTypes.DISKIMPORT]: 'import',
    [TaskTypes.DISKEXPORT]: 'export',
    [TaskTypes.DISKCONTENTEXPORT]: 'export',
    [TaskTypes.DELETECHANNEL]: 'delete',
    [TaskTypes.DELETECONTENT]: 'delete',
  };

  const statusToTrMap = {
    [TaskStatuses.COMPLETED]: 'statusComplete',
    [TaskStatuses.FAILED]: 'statusFailed',
    [TaskStatuses.RUNNING]: 'statusInProgress',
    [TaskStatuses.QUEUED]: 'statusInQueue',
    [TaskStatuses.CANCELED]: 'statusCanceled',
    [TaskStatuses.CANCELING]: 'statusCanceling',
  };

  export default {
    name: 'TaskPanel',
    mixins: [commonCoreStrings, responsiveWindowMixin],
    props: {
      task: {
        type: Object,
        required: true,
      },
    },
    computed: {
      buttonLabel() {
        if (this.taskIsClearable) {
          return this.coreString('clearAction');
        }
        return this.coreString('cancelAction');
      },
      taskIsRunning() {
        return this.task.status === TaskStatuses.RUNNING;
      },
      taskIsCompleted() {
        return this.task.status === TaskStatuses.COMPLETED;
      },
      taskIsCanceling() {
        return this.task.status === TaskStatuses.CANCELING;
      },
      taskIsCanceled() {
        return this.task.status === TaskStatuses.CANCELED;
      },
      taskIsFailed() {
        return this.task.status === TaskStatuses.FAILED || this.taskIsCanceled;
      },
      taskIsCancellable() {
        return this.task.cancellable;
      },
      taskIsClearable() {
        return taskIsClearable(this.task);
      },
      descriptionText() {
        const trName = typeToTrMap[this.task.type];
        return this.$tr(trName, {
          channelName: this.task.channel_name || this.$tr('unknownChannelName'),
          newVersion: this.task.new_version,
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
      finishedSizeText() {
        const {
          transferred_file_size,
          transferred_resources,
          file_size,
          total_resources,
        } = this.task;
        // Special case for canceled exports
        if (
          (this.task.type === TaskTypes.DISKEXPORT ||
            this.task.type === TaskTypes.DISKCONTENTEXPORT) &&
          this.task.status === TaskStatuses.CANCELED
        ) {
          return '';
        }
        if (file_size && total_resources) {
          const trPrefix = typeToTrPrefixMap[this.task.type];
          if (
            transferred_file_size &&
            transferred_resources &&
            (transferred_file_size < file_size || transferred_resources < total_resources)
          ) {
            return this.$tr(`${trPrefix}PartialRatio`, {
              currentResources: transferred_resources,
              totalResources: total_resources,
              currentSize: bytesForHumans(transferred_file_size),
              totalSize: bytesForHumans(file_size),
            });
          } else {
            return this.$tr(`${trPrefix}Success`, {
              totalResources: total_resources,
              totalSize: bytesForHumans(file_size),
            });
          }
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
      startedByUser: {
        message: "Started by '{user}'",
        context: '\nRefers to the content management *task*.\n',
      },
      numResourcesAndSize:
        '{numResources} {numResources, plural, one {resource} other {resources}} ({bytesText})',
      statusInProgress: 'In-progress',
      statusInQueue: 'Waiting',
      statusComplete: {
        message: 'Finished',
        context: '\nLabel indicating that the *task* was completed successfully. \n\n',
      },
      statusFailed: 'Failed',
      statusCanceled: 'Canceled',
      statusCanceling: 'Canceling',
      importChannelWhole: `Import '{channelName}'`,
      importChannelPartial: `Import resources from '{channelName}'`,
      exportChannelWhole: `Export '{channelName}'`,
      exportChannelPartial: `Export resources from '{channelName}'`,
      deleteChannelWhole: `Delete '{channelName}'`,
      deleteChannelPartial: `Delete resources from '{channelName}'`,
      updatingChannelVersion: `Update {channelName} to version {newVersion}`,
      // Catch-all strings if the channel or username doesn't get attached to Task
      unknownUsername: 'Unknown user',
      unknownChannelName: '(Channel name unavailable)',
      progressPercentage: '{progress, number, percent}',
      /* eslint-disable kolibri/vue-no-unused-translations */
      // stubs
      stopAction: 'Stop',
      importPartialRatio:
        '{currentResources} of {totalResources} {totalResources, plural, one {resource} other {resources}} ({currentSize} of {totalSize}) imported',
      exportPartialRatio:
        '{currentResources} of {totalResources} {totalResources, plural, one {resource} other {resources}} ({currentSize} of {totalSize}) exported',
      deletePartialRatio:
        '{currentResources} of {totalResources} {totalResources, plural, one {resource} other {resources}} ({currentSize} of {totalSize}) deleted',
      importSuccess:
        '{totalResources} {totalResources, plural, one {resource} other {resources}} ({totalSize}) successfully imported',
      exportSuccess:
        '{totalResources} {totalResources, plural, one {resource} other {resources}} ({totalSize}) successfully exported',
      deleteSuccess:
        '{totalResources} {totalResources, plural, one {resource} other {resources}} ({totalSize}) successfully deleted',
      /* eslint-enable kolibri/vue-no-unused-translations */
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

    .task-panel-sm & {
      align-self: flex-start;
    }
  }

  .icon svg {
    width: 24px;
    height: 24px;
  }

  .task-panel {
    display: flex;
    align-items: center;
  }

  .task-panel-sm {
    flex-direction: column;
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .details {
    flex-grow: 1;
    width: 100%;
    padding: 16px;

    .task-panel-sm & {
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .details-description {
    font-size: $fs2;
  }

  .details-progress-bar {
    display: flex;
    align-items: center;
    max-width: 450px;
    margin-bottom: 16px;
  }

  // CSS overrides for linear loader
  .k-linear-loader {
    height: 10px;

    /deep/ .ui-progress-linear-progress-bar {
      height: 100%;
    }
  }

  .details-percentage {
    // min-width ensures num % stay on same line
    min-width: 48px;
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

  .buttons {
    .task-panel-sm & {
      align-self: flex-end;
    }
  }

  .buttons-lift {
    // Lift button a little to align with progress bar
    margin-top: -24px;
  }

</style>
