<template>

  <BottomAppBar>
    <div class="task-bar" :class="{'task-bar-sm': windowIsSmall}">
      <div class="progress-bar">
        <div class="message">
          {{ tasksString }}
        </div>
        <KLinearLoader
          v-if="totalTasks >0"
          class="k-linear-loader"
          :delay="false"
          :progress="progress"
          type="determinate"
          :style="{backgroundColor: $themeTokens.fineLine}"
        />
      </div>
      <KRouterLink
        appearance="raised-button"
        :primary="true"
        :text="coreString('viewTasksAction')"
        :to="{name: 'MANAGE_TASKS'}"
      />
    </div>
  </BottomAppBar>

</template>


<script>

  import { mapGetters } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import countBy from 'lodash/countBy';
  import sumBy from 'lodash/sumBy';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'TasksBar',
    components: {
      BottomAppBar,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    props: {},
    data() {
      return {};
    },
    computed: {
      ...mapGetters('manageContent', ['managedTasks']),
      totalTasks() {
        return this.managedTasks.length;
      },
      taskCounts() {
        return countBy(this.managedTasks, 'status');
      },
      doneTasks() {
        return this.taskCounts.COMPLETED || 0;
      },
      progress() {
        const inProgressTasks = this.managedTasks.filter(t => t.status !== 'COMPLETED');
        return (this.doneTasks + sumBy(inProgressTasks, 'percentage') / this.totalTasks) * 100;
      },
      tasksString() {
        if (this.totalTasks === 0) {
          return this.$tr('noTasksStarted');
        } else {
          return this.$tr('someTasksComplete', { done: this.doneTasks, total: this.totalTasks });
        }
      },
    },
    methods: {},
    $trs: {
      someTasksComplete:
        '{done, number} of {total, number} {done, plural, one {task} other {tasks}} complete',
      noTasksStarted: 'No tasks started',
    },
  };

</script>


<style lang="scss" scoped>

  .task-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .message {
    padding: 4px 0;
  }
  .progress-bar {
    min-width: 300px;
    max-width: 400px;
    text-align: left;

    .task-bar-sm & {
      min-width: auto;
      max-width: 200px;
    }
  }

  // CSS overrides for linear loader
  .k-linear-loader {
    height: 10px;

    .task-bar-sm & {
      display: none;
    }

    /deep/ .ui-progress-linear-progress-bar {
      height: 100%;
    }
  }

</style>
