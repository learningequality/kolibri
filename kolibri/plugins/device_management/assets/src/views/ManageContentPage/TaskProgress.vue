<template>

  <div class="task-progress">
    <div class="progress-icon dtc">
      <transition name="fade" mode="out-in">
        <mat-svg
          v-if="taskHasFailed"
          category="alert"
          name="error"
          :style="{ fill: $coreTextError }"
        />
        <mat-svg
          v-else-if="taskHasCompleted"
          category="action"
          name="check_circle"
          :style="{ fill: $coreStatusCorrect }"
        />
        <KCircularLoader
          v-else
          class="inprogress"
          :delay="false"
        />
      </transition>
    </div>

    <div class="progress-bar dtc">
      <div class="task-stage">
        {{ stageText }}
      </div>
      <KLinearLoader
        :type="taskIsPreparing ? 'indeterminate' : 'determinate'"
        :progress="formattedPercentage"
        :delay="false"
      />
    </div>

    <div class="progress-messages dtc">
      <span class="percentage">{{ progressMessage }}</span>
    </div>

    <div v-if="showButtons" class="buttons dtc">
      <KButton
        v-if="taskHasCompleted || taskHasFailed || cancellable"
        :text="taskHasCompleted ? $tr('close') : $tr('cancel')"
        :primary="true"
        :disabled="uiBlocked"
        @click="endTask()"
      />
    </div>

  </div>

</template>


<script>

  import { mapActions } from 'vuex';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import KButton from 'kolibri.coreVue.components.KButton';
  import { TaskTypes, TaskStatuses } from '../../constants';

  const RequiredString = {
    type: String,
    required: true,
  };

  export default {
    name: 'TaskProgress',
    components: {
      KLinearLoader,
      KCircularLoader,
      KButton,
    },
    mixins: [themeMixin],
    props: {
      type: RequiredString,
      status: RequiredString,
      percentage: {
        type: Number,
        required: true,
      },
      cancellable: {
        type: Boolean,
        required: true,
      },
      showButtons: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        uiBlocked: false,
      };
    },
    computed: {
      stageText() {
        // Special case for Channel DB downloading, since they never go into RUNNING
        if (this.type === 'UPDATING_CHANNEL') {
          return this.$tr('updatingChannel');
        }
        if (this.type === 'DOWNLOADING_CHANNEL_CONTENTS') {
          return this.$tr('downloadingChannelContents');
        }

        if (this.status === TaskStatuses.RUNNING) {
          switch (this.type) {
            case TaskTypes.REMOTE_IMPORT:
            case TaskTypes.LOCAL_IMPORT:
              return this.$tr('importingContent');
            case TaskTypes.LOCAL_EXPORT:
              return this.$tr('exportingContent');
            case TaskTypes.DELETE_CHANNEL:
              return this.$tr('deletingChannel');
            default:
              return '';
          }
        }
        if (this.taskHasFailed) {
          switch (this.type) {
            case TaskTypes.DELETE_CHANNEL:
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
        return this.status === TaskStatuses.FAILED;
      },
      taskHasCompleted() {
        return this.status === TaskStatuses.COMPLETED;
      },
      taskIsPreparing() {
        return this.status === TaskStatuses.QUEUED || this.status === TaskStatuses.SCHEDULED;
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
    methods: {
      ...mapActions('manageContent', ['cancelTask', 'refreshChannelList']),
      endTask() {
        this.uiBlocked = true;
        this.$emit('cleartask', () => {
          this.uiBlocked = false;
        });
      },
    },
    $trs: {
      importingContent: 'Importing content…',
      exportingContent: 'Exporting content…',
      finished: 'Finished! Click "Close" button to see changes.',
      preparingTask: 'Preparing…',
      close: 'Close',
      cancel: 'Cancel',
      taskHasFailed: 'Transfer failed. Please try again.',
      deleteTaskHasFailed: 'Attempt to delete channel failed. Please try again.',
      deletingChannel: 'Deleting channel…',
      downloadingChannelContents: 'Generating channel listing. This could take a few minutes…',
      updatingChannel: 'Updating channel…',
    },
  };

</script>


<style lang="scss" scoped>

  .progress-icon {
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
    padding-right: 1em;
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

</style>
