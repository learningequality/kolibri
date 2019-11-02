<template>

  <div>
    <p v-if="!loading && taskList.length === 0" class="no-tasks">
      {{ $tr('emptyTasksMessage') }}
    </p>

    <div class="tasks-panels">
      <TaskPanel
        v-for="task in taskList"
        :key="task.id"
        :task="task"
        @clickclear="handleClickClear(task)"
        @clickcancel="handleClickCancel(task)"
      />
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { TaskResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
      ...mapState('manageContent', ['taskList']),
    },
    mounted() {
      // Wait some time for first poll from Tasks API
      if (this.taskList.length === 0) {
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
        TaskResource.postListEndpoint('cleartask', { task_id: task.id });
      },
      handleClickCancel(task) {
        TaskResource.cancelTask({ task_id: task.id });
      },
    },
    $trs: {
      appBarTitle: 'Task manager',
      emptyTasksMessage: 'Tasks you initiate will appear here',
    },
  };

</script>


<style lang="scss" scoped>

  .task-panels {
    max-width: 780px;
  }

  .no-tasks {
    padding: 128px 0;
    font-size: 24px;
    text-align: center;
  }

</style>
