<template>

  <div>

    <p>
      <BackLink
        :to="$router.getRoute(homeRoute)"
        :text="$tr('backToChannelsAction')"
      />
    </p>
    <KGrid>
      <KGridItem :layout8="{ span: 5 }" :layout12="{ span: 8 }">
        <h1>
          {{ $tr('tasksHeader') }}
        </h1>
      </KGridItem>
      <KGridItem
        :layout8="{ span: 3, alignment: 'right' }"
        :layout12="{ span: 4, alignment: 'right' }"
      >
        <KButton
          v-if="showClearCompletedButton"
          :text="$tr('clearCompletedAction')"
          :class="{ 'button-offset': windowIsLarge }"
          @click="handleClickClearAll"
        />
      </KGridItem>
    </KGrid>

    <KLinearLoader v-if="loading" :delay="false" type="indeterminate" />

    <p v-if="!loading && managedTasks.length === 0" class="empty-tasks-message">
      {{ $tr('emptyTasksMessage') }}
    </p>
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
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { PageNames, taskIsClearable } from '../../constants';

  import TaskPanel from './TaskPanel';
  import BackLink from './BackLink';

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
      BackLink,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
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
      homeRoute() {
        return PageNames.MANAGE_CONTENT_PAGE;
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
    methods: {
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
      clearCompletedAction: {
        message: 'Clear completed',
        context:
          '\nButton on the task manager page.\nWhen pressed it will clear all the completed tasks from the list.\n\n\n',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .button-offset {
    margin-top: 24px;
  }

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
