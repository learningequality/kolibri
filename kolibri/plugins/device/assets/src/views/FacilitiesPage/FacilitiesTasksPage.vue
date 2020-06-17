<template>

  <div>
    <p>
      <KRouterLink
        :to="{ name: 'FACILITIES_PAGE' }"
        :text="$tr('backToFacilitiesLabel')"
      />
    </p>

    <HeaderWithOptions :headerText="coreString('tasksLabel')">
      <template #options>
        <KButton
          v-if="someClearableTasks"
          :text="getTaskString('clearCompletedTasksAction')"
          @click="handleClickClearAll"
        />
      </template>
    </HeaderWithOptions>

    <p v-if="tasks.length === 0">
      {{ $tr('emptyTasksMessage') }}
    </p>
    <div>
      <FacilityTaskPanel
        v-for="(task, idx) in tasks"
        :key="idx"
        class="task-panel"
        :style="{ borderBottomColor: $themePalette.grey.v_200 }"
        :task="task"
      />
    </div>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonTaskStrings from 'kolibri.coreVue.mixins.commonTaskStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import HeaderWithOptions from '../HeaderWithOptions';
  import { taskIsClearable } from '../../constants';
  import FacilityTaskPanel from './FacilityTaskPanel';

  export default {
    name: 'FacilitiesTasksPage',
    metaInfo() {
      return {
        title: this.coreString('tasksLabel'),
      };
    },
    components: {
      FacilityTaskPanel,
      HeaderWithOptions,
    },
    mixins: [commonCoreStrings, commonTaskStrings, commonSyncElements],
    props: {},
    data() {
      return {
        tasks: [],
      };
    },
    computed: {
      someClearableTasks() {
        return Boolean(this.tasks.find(taskIsClearable));
      },
      visibleTasks() {
        return this.tasks.map();
      },
    },
    beforeMount() {
      this.pollSyncTasks();
    },
    methods: {
      handleClickClearAll() {
        this.deleteFinishedTasks().then(() => {
          this.pollSyncTasks();
        });
      },
      pollSyncTasks() {
        this.fetchKdpSyncTasks()
          .then(tasks => {
            this.tasks = tasks;
          })
          .then(() => {
            if (this.tasks.length > 0) {
              setTimeout(() => {
                return this.pollSyncTasks();
              }, 2000);
            }
          });
      },
    },
    $trs: {
      backToFacilitiesLabel: 'Back to facilities',
      emptyTasksMessage: 'There are no tasks to display',
    },
  };

</script>


<style lang="scss" scoped>

  .buttons {
    margin: auto;
  }

  .task-panel {
    border-bottom: 1px solid;

    &:last-of-type {
      border-bottom-style: none;
    }
  }

</style>
