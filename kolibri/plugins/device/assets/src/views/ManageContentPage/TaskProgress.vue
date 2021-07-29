<template>

  <transition name="fade">
    <div v-if="$attrs.show" class="task-progress">
      <div class="dtc progress-icon">
        <transition name="fade" mode="out-in">
          <KIcon
            v-if="taskHasFailed"
            icon="error"
            :color="$themeTokens.error"
          />
          <KIcon
            v-else-if="taskHasCompleted"
            icon="correct"
            :color="$themeTokens.success"
          />
          <KCircularLoader
            v-else
            class="inprogress"
            :delay="false"
          />
        </transition>
      </div>

      <div class="dtc progress-bar">
        <div :class="{ 'task-stage': !taskHasCompleted }">
          {{ stageText }}
        </div>
        <KLinearLoader
          v-if="!taskHasCompleted"
          :type="taskIsPreparing ? 'indeterminate' : 'determinate'"
          :progress="formattedPercentage"
          :delay="false"
        />
      </div>

      <div v-if="!taskHasCompleted" class="dtc progress-messages">
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
        default: null,
      },
      percentage: {
        type: Number,
        default: null,
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
      importingContent: {
        message: 'Importing resources…',
        context: 'Indicates that selected resources are being imported.\n',
      },
      exportingContent: {
        message: 'Exporting resources…',
        context: 'Indicates that selected resources are being exported to a drive.',
      },
      finished: {
        message: 'Finished! Click "Close" button to see changes.',
        context: 'Indicates when a task has completed.',
      },
      preparingTask: {
        message: 'Preparing…',
        context: 'Indicates that a task is being prepared.',
      },
      taskHasFailed: {
        message: 'Transfer failed. Please try again.',
        context:
          'Indicates that a task, like a transfer of learning resources from an external drive to a facility, has failed.',
      },
      deleteTaskHasFailed: {
        message: 'Attempt to delete channel failed. Please try again.',
        context: 'Indicates if a deletion of a channel has failed in the task manager.',
      },
      deletingChannel: {
        message: 'Deleting channel…',
        context: 'Indicates a channel is being deleted.',
      },
      downloadingChannelContents: {
        message: 'Generating channel listing. This could take a few minutes',
        context:
          'Text in the task manager panel indicating that a channel listing is being created.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      updatingChannel: {
        message: 'Updating channel…',
        context:
          'Indicates that a channel is in the process of being updated with some new resources.',
      },
      comparingChannelContents: {
        message:
          'Comparing resources on device with new channel version. This could take a few minutes',
        context: 'Describes an ongoing task in the task manager.',
      },
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
