<template>

  <transition name="fade">
    <div v-if="$attrs.show" class="task-progress">
      <div class="progress-icon dtc">
        <transition name="fade" mode="out-in">
          <mat-svg
            v-if="taskHasFailed"
            category="alert"
            name="error"
            :style="{ fill: $themeTokens.error }"
          />
          <mat-svg
            v-else-if="taskHasCompleted"
            category="action"
            name="check_circle"
            :style="{ fill: $themeTokens.success }"
          />
          <KCircularLoader
            v-else
            class="inprogress"
            :delay="false"
          />
        </transition>
      </div>

      <div class="progress-bar dtc">
        <div :class="{'task-stage': !taskHasCompleted}">
          {{ stageText }}
        </div>
        <KLinearLoader
          v-if="!taskHasCompleted"
          :type="taskIsPreparing ? 'indeterminate' : 'determinate'"
          :progress="formattedPercentage"
          :delay="false"
        />
      </div>

      <div v-if="!taskHasCompleted" class="progress-messages dtc">
        <span class="percentage">{{ progressMessage }}</span>
      </div>

    </div>
  </transition>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskTypes, TaskStatuses } from '../../constants';

  export default {
    name: 'TaskProgress',
    mixins: [commonCoreStrings],
    props: {
      type: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        required: false,
      },
      percentage: {
        type: Number,
      },
    },
    computed: {
      TaskStatuses: () => TaskStatuses,
      stageText() {
        // TODO Delete dead code, since this component is only used for IMPORTCHANNEL Tasks
        if (this.type === 'DOWNLOADING_CHANNEL_CONTENTS') {
          return this.$tr('downloadingChannelContents');
        }

        if (this.status === this.TaskStatuses.RUNNING) {
          switch (this.type) {
            case TaskTypes.REMOTECONTENTIMPORT:
            case TaskTypes.DISKCONTENTIMPORT:
              return this.$tr('importingContent');
            case TaskTypes.DISKEXPORT:
              return this.$tr('exportingContent');
            case TaskTypes.DELETECHANNEL:
              return this.$tr('deletingChannel');
            default:
              return '';
          }
        }
        if (this.taskHasFailed) {
          switch (this.type) {
            case TaskTypes.DELETECHANNEL:
              return this.$tr('deleteTaskHasFailed');
            default:
              return this.$tr('taskHasFailed');
          }
        }
        if (this.taskHasCompleted) {
          return this.$tr('finished');
        }
        if (this.taskIsPreparing) {
          return this.$tr('preparingTask');
        }

        return '';
      },
      taskHasFailed() {
        return this.status === this.TaskStatuses.FAILED;
      },
      taskHasCompleted() {
        return this.status === this.TaskStatuses.COMPLETED;
      },
      taskIsPreparing() {
        return (
          this.status === this.TaskStatuses.QUEUED || this.status === this.TaskStatuses.SCHEDULED
        );
      },
      formattedPercentage() {
        return this.percentage * 100;
      },
      progressMessage() {
        if (this.percentage > 0) {
          return this.formattedPercentage.toFixed(2) + '%';
        }
        return '';
      },
    },
    $trs: {
      importingContent: 'Importing resources…',
      exportingContent: 'Exporting resources…',
      finished: 'Finished! Click "Close" button to see changes.',
      preparingTask: 'Preparing…',
      taskHasFailed: 'Transfer failed. Please try again.',
      deleteTaskHasFailed: 'Attempt to delete channel failed. Please try again.',
      deletingChannel: 'Deleting channel…',
      downloadingChannelContents: 'Generating channel listing. This could take a few minutes',
      /* eslint-disable kolibri/vue-no-unused-translations */
      updatingChannel: 'Updating channel…',
      comparingChannelContents:
        'Comparing resources on device with new channel version. This could take a few minutes',
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

  .progress-icon {
    position: relative;
    top: -2px;
    width: 5%;
    text-align: center;
    .inprogress {
      display: inline-block;
    }
  }

  .task-progress {
    display: table;
    width: 100%;
    height: 5em;
    margin-left: -6px;
    vertical-align: middle;
  }

  .task-stage {
    margin-bottom: 0.5em;
  }

  .progress-bar {
    width: 50%;
    padding-bottom: 8px;
    padding-left: 8px;
    font-size: 0.75em;
  }

  .progress-messages {
    padding-left: 16px;
  }

  .percentage {
    font-weight: bold;
  }

  .buttons {
    text-align: right;
  }

  .dtc {
    display: table-cell;
    vertical-align: inherit;
  }

  .btn {
    margin: 0;
  }

  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s;
  }

</style>
