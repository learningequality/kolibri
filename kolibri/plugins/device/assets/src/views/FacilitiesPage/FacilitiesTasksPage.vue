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
  import { syncStatusToDescriptionMap, removeStatusToDescriptionMap } from '../syncTaskUtils';
  import { taskIsClearable } from '../../constants';
  import FacilityTaskPanel from './FacilityTaskPanel';

  // TODO remove these functions since they're just for generating examples
  // function makeSyncTask(status) {
  //   return {
  //     type: 'SYNC_FACILITY',
  //     status,
  //     device_name: 'fcorp.local',
  //     device_id: '4a9a',
  //     facility_name: 'Atkinson Hall',
  //     facility_id: 'D81C',
  //     started_by_username: 'jb',
  //     bytes_sent: 1000000,
  //     bytes_received: 500000000,
  //     percentage: 0.6,
  //   };
  // }
  //
  // function makeRemoveTask(status) {
  //   return {
  //     type: 'REMOVE_FACILITY',
  //     status,
  //     facility_name: 'Atkinson Hall',
  //     facility_id: 'D81C',
  //     started_by_username: 'jb',
  //     percentage: 0.7,
  //   };
  // }
  // const syncExamples = [
  //   ...Object.keys(syncStatusToDescriptionMap).map(makeSyncTask),
  //   ...Object.keys(removeStatusToDescriptionMap).map(makeRemoveTask),
  // ];
  //
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
    },
    beforeMount() {
      this.pollSyncTasks();
    },
    methods: {
      handleClickClearAll() {
        this.deleteFinishedTasks();
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
