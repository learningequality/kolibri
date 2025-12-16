<template>

  <div class="progress-bar">
    <p v-if="totalTasks > 0">
      {{ tasksString }}
    </p>
    <p>
      <KLinearLoader
        v-if="totalTasks > 0"
        class="k-linear-loader"
        :delay="false"
        :progress="progress"
        type="determinate"
        :style="{ backgroundColor: $themeTokens.fineLine }"
      />
    </p>
    <p>
      <KButton
        v-if="showClearCompletedButton"
        appearance="basic-link"
        :text="getTaskString('clearCompletedTasksAction')"
        @click="$emit('clearall')"
      />
      <span>&nbsp;&nbsp;</span>
      <KRouterLink
        appearance="basic-link"
        :text="$tr('taskManagerLink')"
        :to="taskManagerLink"
      />
    </p>
  </div>

</template>


<script>

  import some from 'lodash/some';
  import sumBy from 'lodash/sumBy';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonTaskStrings from 'kolibri-common/uiText/tasks';

  export default {
    name: 'TasksBar',
    mixins: [commonCoreStrings, commonTaskStrings],
    props: {
      tasks: {
        type: Array,
        required: true,
      },
      taskManagerLink: {
        type: Object,
        required: true,
      },
    },
    computed: {
      showClearCompletedButton() {
        return some(this.tasks, task => task.clearable);
      },
      totalTasks() {
        return this.tasks.length;
      },
      clearableTasks() {
        return this.tasks.filter(t => t.clearable);
      },
      inProgressTasks() {
        return this.tasks.filter(t => !t.clearable);
      },
      progress() {
        return (
          ((this.clearableTasks.length + sumBy(this.inProgressTasks, 'percentage')) /
            this.totalTasks) *
          100
        );
      },
      tasksString() {
        return this.$tr('someTasksComplete', {
          done: this.clearableTasks.length,
          total: this.totalTasks,
        });
      },
    },
    $trs: {
      someTasksComplete: {
        message:
          '{done, number} of {total, plural, one {{total, number} task completed} other {{total, number} tasks completed}}',
        context: "Indicates the amount of tasks completed. For example:\n\n'7 tasks completed'",
      },
      taskManagerLink: {
        message: 'View task manager',
        context:
          'Text link on the Device > Channel section which tasks user to a page where they can see all the current tasks and their statuses.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .progress-bar {
    max-width: 400px;
    text-align: left;
  }

  // CSS overrides for linear loader
  .k-linear-loader {
    height: 8px;

    /deep/ .ui-progress-linear-progress-bar {
      height: 100%;
    }
  }

</style>
