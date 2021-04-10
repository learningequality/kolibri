<template>

  <div class="progress-bar" dir="auto">
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

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import some from 'lodash/some';
  import sumBy from 'lodash/sumBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonTaskStrings from 'kolibri.coreVue.mixins.commonTaskStrings';

  export default {
    name: 'TasksBar',
    mixins: [commonCoreStrings, responsiveWindowMixin, commonTaskStrings],
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
      someTasksComplete:
        '{done, number} of {total, plural, one {{total, number} task completed} other {{total, number} tasks completed}}',
      taskManagerLink: 'View task manager',
    },
  };

</script>


<style lang="scss" scoped>

  .progress-bar {
    max-width: 400px;
  }

  // CSS overrides for linear loader
  .k-linear-loader {
    height: 8px;

    /deep/ .ui-progress-linear-progress-bar {
      height: 100%;
    }
  }

</style>
