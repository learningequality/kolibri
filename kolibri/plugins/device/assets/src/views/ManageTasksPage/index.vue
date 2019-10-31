<template>

  <div>
    <p v-if="!loading && tasks.length ===0" class="no-tasks">
      {{ $tr('emptyTasksMessage') }}
    </p>

    <div class="tasks">
      <TaskPanel
        v-for="task in tasks"
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
      ...mapState('manageContent', {
        tasks: 'taskList',
      }),
    },
    mounted() {
      // Wait some time for first poll from Tasks API
      setTimeout(() => {
        this.loading = false;
      }, 2000);
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
        console.log(task);
      },
    },
    $trs: {
      appBarTitle: 'Task manager',
      emptyTasksMessage: 'Tasks you initiate will appear here',
    },
  };

</script>


<style lang="scss" scoped>

  .tasks {
    max-width: 780px;
  }

  .no-tasks {
    padding: 128px 0;
    text-align: center;
  }

</style>
