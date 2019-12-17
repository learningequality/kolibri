<template>

  <div class="progress-bar">
    <p v-if="totalTasks">
      {{ tasksString }}
    </p>
    <p>
      <KLinearLoader
        v-if="totalTasks >0"
        class="k-linear-loader"
        :delay="false"
        :progress="progress"
        type="determinate"
        :style="{backgroundColor: $themeTokens.fineLine}"
      />
    </p>
    <p>
      <KButton
        v-if="showClearCompletedButton"
        appearance="basic-link"
        :text="clearCompletedString"
        @click="handleClickClearAll"
      />
    </p>

  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import countBy from 'lodash/countBy';
  import some from 'lodash/some';
  import sumBy from 'lodash/sumBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import ManageTasksPage from '../ManageTasksPage';
  import { taskIsClearable } from '../../constants';

  const manageTasksStrings = crossComponentTranslator(ManageTasksPage);

  export default {
    name: 'TasksBar',
    mixins: [commonCoreStrings, responsiveWindowMixin],
    computed: {
      ...mapGetters('manageContent', ['managedTasks']),
      clearCompletedString() {
        /* eslint-disable kolibri/vue-no-undefined-string-uses */
        // TODO remove
        // shows up as 'undefined', possibly due to cross component translator
        return manageTasksStrings.$tr('clearCompletedAction');
        /* eslint-enable kolibri/vue-no-undefined-string-uses */
      },
      showClearCompletedButton() {
        return some(this.managedTasks, taskIsClearable);
      },
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
        return ((this.doneTasks + sumBy(inProgressTasks, 'percentage')) / this.totalTasks) * 100;
      },
      tasksString() {
        return this.$tr('someTasksComplete', { done: this.doneTasks, total: this.totalTasks });
      },
    },
    methods: {
      handleClickClearAll() {
        TaskResource.deleteFinishedTasks();
      },
    },
    $trs: {
      someTasksComplete:
        '{done, number} of {total, number} {done, plural, one {task} other {tasks}} complete',
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
