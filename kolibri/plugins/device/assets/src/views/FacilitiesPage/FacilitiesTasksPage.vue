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

    <p v-if="facilityTasks.length === 0">
      {{ emptyTasksMessage }}
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
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import HeaderWithOptions from '../HeaderWithOptions';
  import { taskIsClearable } from '../../constants';
  import ManageTasksPage from '../ManageTasksPage';
  import FacilityTaskPanel from './FacilityTaskPanel';
  import facilityTasksQueue from './facilityTasksQueue';

  const ManageTasksPageStrings = crossComponentTranslator(ManageTasksPage);

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
    mixins: [commonCoreStrings, commonTaskStrings, commonSyncElements, facilityTasksQueue],
    props: {},
    data() {
      return {
        // (facilityTasksQueue) facilityTasks
      };
    },
    computed: {
      someClearableTasks() {
        return Boolean(this.facilityTasks.find(taskIsClearable));
      },
      emptyTasksMessage() {
        // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
        return ManageTasksPageStrings.$tr('emptyTasksMessage');
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
      backToFacilitiesLabel: 'Back to facilities',
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
