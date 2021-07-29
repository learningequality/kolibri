<template>

  <div>
    <p>
      <BackLink
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

    <p v-if="facilityTasks.length === 0">
      {{ deviceString('emptyTasksMessage') }}
    </p>
    <div>
      <FacilityTaskPanel
        v-for="(task, idx) in facilityTasks"
        :key="idx"
        class="task-panel"
        :style="{ borderBottomColor: $themePalette.grey.v_200 }"
        :task="task"
        @click="handlePanelClick($event, task)"
      />
    </div>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonTaskStrings from 'kolibri.coreVue.mixins.commonTaskStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import HeaderWithOptions from '../HeaderWithOptions';
  import BackLink from '../ManageTasksPage/BackLink';
  import commonDeviceStrings from '../commonDeviceStrings';
  import FacilityTaskPanel from './FacilityTaskPanel';
  import facilityTasksQueue from './facilityTasksQueue';

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
      BackLink,
    },
    mixins: [
      commonCoreStrings,
      commonTaskStrings,
      commonSyncElements,
      facilityTasksQueue,
      commonDeviceStrings,
    ],
    data() {
      return {
        // (facilityTasksQueue) facilityTasks
      };
    },
    computed: {
      someClearableTasks() {
        return Boolean(this.facilityTasks.find(task => task.clearable));
      },
    },
    methods: {
      handleClickClearAll() {
        this.clearCompletedFacilityTasks();
      },
      handlePanelClick(action, task) {
        this.manageFacilityTask(action, task).catch(() => {
          // handle errors silently
        });
      },
    },
    $trs: {
      backToFacilitiesLabel: {
        message: 'Back to facilities',
        context:
          'Link to take user back to the Device > Facilities page where they can see the list of facilities.',
      },
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
