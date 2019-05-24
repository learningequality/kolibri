<template>

  <KGrid style="text-align: left; margin-top: 8px">
    <KGridItem size="1" style="padding-top: 8px">
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
        <KCircularLoader v-else :delay="false" />
      </transition>
    </KGridItem>

    <KGridItem size="5" style="padding-top: 8px">
      <div>
        {{ stageText }}
      </div>
      <div>
        <KLinearLoader
          v-if="!taskHasCompleted || true"
          :type="taskIsPreparing ? 'indeterminate' : 'determinate'"
          :progress="formattedPercentage"
          :delay="false"
        />
        <div v-if="!taskHasCompleted || true">
          <span class="percentage">{{ progressMessage }}</span>
        </div>
      </div>
    </KGridItem>

    <KGridItem v-if="showButtons" size="2" alignment="right">
      <KButton
        v-if="taskHasCompleted || taskHasFailed || cancellable"
        class="btn"
        :text="taskHasCompleted || taskHasFailed ? $tr('close') : $tr('cancel')"
        :primary="true"
        :disabled="uiBlocked"
        @click="endTask()"
      />
    </KGridItem>

  </KGrid>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
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
      KGrid,
      KGridItem,
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
      TaskStatuses: () => TaskStatuses,
      stageText() {
        // Special case for Channel DB downloading, since they never go into RUNNING
        if (this.type === 'UPDATING_CHANNEL') {
          return this.$tr('updatingChannel');
        }
        if (this.type === 'DOWNLOADING_CHANNEL_CONTENTS') {
          return this.$tr('downloadingChannelContents');
        }

        if (this.status === this.TaskStatuses.RUNNING) {
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
    watch: {
      taskHasCompleted(newValue, oldValue) {
        // Once it becomes complete, always set to false
        if (!oldValue && newValue) {
          this.uiBlocked = false;
        }
      },
      taskHasFailed(newValue, oldValue) {
        // Once it becomes failed, always set to false
        if (!oldValue && newValue) {
          this.uiBlocked = false;
        }
      },
    },
    methods: {
      endTask() {
        this.uiBlocked = true;
        if (this.taskHasCompleted || this.taskHasFailed) {
          this.$emit('cleartask', () => {
            this.uiBlocked = false;
          });
        } else if (this.cancellable) {
          this.$emit('canceltask');
        } else {
          this.uiBlocked = false;
        }
      },
    },
    $trs: {
      importingContent: 'Importing content…',
      exportingContent: 'Exporting content…',
      finished: "Finished deleting 'Touchable Earth (en)'",
      preparingTask: 'Preparing…',
      close: 'Continue',
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

  .percentage {
    font-weight: bold;
  }

  .btn {
    margin: 0;
  }

</style>
