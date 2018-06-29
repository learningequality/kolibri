<template>

  <div class="task-progress">
    <div class="progress-icon dtc">
      <transition name="fade" mode="out-in">
        <mat-svg
          v-if="taskHasFailed"
          category="alert"
          name="error"
          class="error"
        />
        <mat-svg
          v-else-if="taskHasCompleted"
          category="action"
          name="check_circle"
          class="complete"
        />
        <k-circular-loader
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
      <k-linear-loader
        :type="taskIsPreparing ? 'indeterminate' : 'determinate'"
        :progress="formattedPercentage"
        :delay="false"
      />
    </div>

    <div class="progress-messages dtc">
      <span class="percentage">{{ progressMessage }}</span>
    </div>

    <div v-if="showButtons" class="buttons dtc">
      <k-button
        v-if="taskHasCompleted || taskHasFailed || cancellable"
        :text="taskHasCompleted ? $tr('close') : $tr('cancel')"
        :primary="true"
        @click="endTask()"
        :disabled="uiBlocked"
      />
    </div>

  </div>

</template>


<script>

  import kLinearLoader from 'kolibri.coreVue.components.kLinearLoader';
  import kCircularLoader from 'kolibri.coreVue.components.kCircularLoader';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { refreshChannelList } from '../../state/actions/manageContentActions';
  import { cancelTask } from '../../state/actions/taskActions';
  import { TaskTypes, TaskStatuses } from '../../constants';

  const RequiredString = {
    type: String,
    required: true,
  };

  export default {
    name: 'taskProgress',
    components: {
      kLinearLoader,
      kCircularLoader,
      kButton,
    },
    props: {
      type: RequiredString,
      status: RequiredString,
      percentage: {
        type: Number,
        required: true,
      },
      id: RequiredString,
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
      TaskStatuses: () => TaskStatuses,
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
      endTask() {
        this.uiBlocked = true;
        this.$emit('cleartask', () => {
          this.uiBlocked = false;
        });
      },
    },
    vuex: {
      actions: {
        cancelTask,
        refreshChannelList,
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .progress-icon
    text-align: center
    width: 5%
    .inprogress
      display: inline-block
    .complete
      fill: $core-status-correct
    .error
      fill: $core-text-error

  .task-progress
    display: table
    width: 100%
    height: 5em
    vertical-align: middle
    padding-left: 1em
    padding-right: 1em

  .task-stage
    margin-bottom: 0.5em

  .progress-bar
    width: 50%
    font-size: 0.75em
    padding-bottom: 10px

  .progress-messages
    padding-left: 1em
    padding-right: 1em

  .percentage
    font-weight: bold

  .buttons
    text-align: right

  .dtc
    display: table-cell
    vertical-align: inherit

</style>
