<template>

  <ImmersivePage
    :appBarTitle="$tr('facilitiesTaskManagerTitle')"
    :route="backRoute"
  >
    <KPageContainer class="device-container">
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
          v-for="(task, idx) in activeFacilityTasks"
          :key="idx"
          class="task-panel"
          :style="{ borderBottomColor: $themePalette.grey.v_300 }"
          :task="task"
          @cancel="cancel(task)"
          @clear="clear(task)"
          @retry="retry(task)"
        />
      </div>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import TaskResource from 'kolibri/apiResources/TaskResource';
  import FacilityTaskPanel from 'kolibri-common/components/syncComponentSet/FacilityTaskPanel';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonTaskStrings from 'kolibri-common/uiText/tasks';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import HeaderWithOptions from '../HeaderWithOptions';
  import commonDeviceStrings from '../commonDeviceStrings';
  import { PageNames } from '../../constants';
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
      ImmersivePage,
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
      backRoute() {
        return { name: PageNames.FACILITIES_PAGE };
      },
      someClearableTasks() {
        return Boolean(this.activeFacilityTasks.find(task => task.clearable));
      },
    },
    methods: {
      handleClickClearAll() {
        this.clearCompletedFacilityTasks();
      },
      cancel(task) {
        return TaskResource.cancel(task.id);
      },
      clear(task) {
        return TaskResource.clear(task.id);
      },
      retry(task) {
        return TaskResource.restart(task.id);
      },
    },
    $trs: {
      facilitiesTaskManagerTitle: {
        message: 'Facilities - Task manager',
        context: 'Title of the page that displays all the tasks in the task manager.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

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
