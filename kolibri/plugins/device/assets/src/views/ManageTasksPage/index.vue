<template>

  <div>

    <!-- Stubbed out in case we need it -->
    <template v-if="false">
      <h1>
        {{ $tr('tasksHeader') }}
      </h1>
      <p>
        <!-- Stubbed out in case we need it -->
        <a href="#">{{ $tr('backToChannelsAction') }}</a>
      </p>
    </template>
    <p v-if="!loading && managedTasks.length === 0" class="empty-tasks-message">
      {{ $tr('emptyTasksMessage') }}
    </p>

    <KButton
      v-if="showClearCompletedButton"
      :text="$tr('clearCompletedAction')"
      @click="handleClickClearAll"
    />
    <transition-group name="fade" class="task-panels">
      <TaskPanel
        v-for="task in sortedTaskList"
        :key="task.id"
        :task="task"
        class="task-panel"
        :style="{ borderBottomColor: $themePalette.grey.v_200 }"
        @clickclear="handleClickClear(task)"
        @clickcancel="handleClickCancel(task)"
      />
    </transition-group>
  </div>

</template>


<script>

  import reverse from 'lodash/fp/reverse';
  import some from 'lodash/some';
  import { mapGetters } from 'vuex';
  import { TaskResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { taskIsClearable } from '../../constants';
  import TaskPanel from './TaskPanel';

  // A page to view content import/export/deletion tasks
  export default {
    name: 'ManageTasksPage',
    metaInfo() {
      return {
        title: this.$tr('appBarTitle'),
      };
    },
    components: {
      TaskPanel,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        loading: true,
      };
    },
    computed: {
      ...mapGetters('manageContent', ['managedTasks']),
      sortedTaskList() {
        return reverse(this.managedTasks);
      },
      showClearCompletedButton() {
        return some(this.managedTasks, taskIsClearable);
      },
    },
    watch: {
      managedTasks(val) {
        if (val.length > 0) {
          this.loading = false;
        }
      },
    },
    mounted() {
      // Wait some time for first poll from Tasks API
      if (this.managedTasks.length === 0) {
        setTimeout(() => {
          this.loading = false;
        }, 2000);
      }
    },
    beforeMount() {
      this.setAppBarTitle();
    },
    methods: {
      setAppBarTitle() {
        this.$store.commit('coreBase/SET_APP_BAR_TITLE', this.$tr('appBarTitle'));
      },
      handleClickClear(task) {
        TaskResource.deleteFinishedTask(task.id).catch(() => {
          // error silently
        });
      },
      handleClickCancel(task) {
        TaskResource.cancelTask(task.id);
      },
      handleClickClearAll() {
        TaskResource.deleteFinishedTasks();
      },
    },
    $trs: {
      backToChannelsAction: 'Back to channels',
      tasksHeader: 'Tasks',
      appBarTitle: 'Task manager',
      emptyTasksMessage: 'There are no tasks to display',
      clearCompletedAction: 'Clear completed',
    },
  };

</script>


<style lang="scss" scoped>

  .task-panels {
    margin-top: 32px;
  }

  .task-panel {
    border-bottom: 1px solid;

    &:last-of-type {
      border-bottom-style: none;
    }
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
