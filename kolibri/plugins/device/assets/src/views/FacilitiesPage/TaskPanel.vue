<template>

  <div class="task-panel" :class="{ 'task-panel-sm': windowIsSmall }">
    <div class="icon">
      <transition mode="out-in">
        <KCircularLoader
          v-if="showCircularLoader"
          :size="24"
          :stroke="5"
        />
        <KIcon
          v-else-if="taskIsFailed"
          icon="helpNeeded"
          :style="{ fill: $themeTokens.error }"
        />
        <KIcon
          v-else-if="taskIsCompleted"
          icon="done"
          :style="{ fill: $themeTokens.success }"
        />
        <KIcon
          v-else
          icon="inProgress"
          :style="{ fill: $themeTokens.annotation }"
        />
      </transition>
    </div>

    <div class="details">
      <p class="details-status" :style="{ color: $themeTokens.annotation }">
        {{ statusMsg }}
      </p>

      <h2 class="details-description">
        {{ headingMsg }}
      </h2>

      <slot name="underheading"></slot>

      <div v-if="loaderType" class="details-progress-bar">
        <template v-if="loaderType === 'determinate'">
          <KLinearLoader
            class="k-linear-loader"
            type="determinate"
            :delay="false"
            :progress="task.percentage * 100"
            :style="{ backgroundColor: $themeTokens.fineLine }"
          />
          <span v-if="taskPercentage" class="details-percentage">
            {{ $formatNumber(taskPercentage, { style: 'percent' }) }}
          </span>
        </template>

        <template v-else-if="loaderType === 'indeterminate'">
          <KLinearLoader
            class="k-linear-loader"
            type="indeterminate"
            :delay="false"
            :style="{ backgroundColor: $themeTokens.fineLine }"
          />
        </template>
      </div>

      <slot name="underprogressbar"></slot>

      <p class="details-startedby" :style="{ color: $themeTokens.annotation }">
        {{ startedByMsg }}
      </p>
    </div>

    <div class="buttons" :class="{ 'button-lift': Boolean(loaderType) }">
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

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { taskIsClearable, TaskStatuses } from '../../constants';
  import { taskStringsMixin } from '../taskStrings';

  export default {
    name: 'TaskPanel',
    mixins: [commonCoreStrings, responsiveWindowMixin, taskStringsMixin],
    props: {
      task: {
        type: Object,
        required: true,
      },
      statusMsg: {
        type: String,
        required: true,
      },
      headingMsg: {
        type: String,
        required: true,
      },
      showCircularLoader: {
        type: Boolean,
        required: true,
      },
      loaderType: {
        type: String,
        required: false,
        validator(value) {
          return value === 'determinate' || value === 'indeterminate';
        },
      },
    },
    computed: {
      buttonLabel() {
        if (this.taskIsClearable) {
          return this.coreString('clearAction');
        }
        return this.coreString('cancelAction');
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
      taskPercentage() {
        return this.task.percentage;
      },
      // loaderType() {
      //   // Show an indeterminate loader while bulk import is still in pre-importcontent step.
      //   if (this.taskPercentage === null) {
      //     return 'indeterminate';
      //   }
      //   return 'determinate';
      // },
      startedByMsg() {
        return this.getTaskString('taskStartedByLabel', {
          user: this.task.started_by_username || this.getTaskString('unknownUsername'),
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
