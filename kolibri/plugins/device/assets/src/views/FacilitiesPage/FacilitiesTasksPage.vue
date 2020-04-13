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
          :text="taskString('clearCompletedTasksAction')"
          @click="handleClickClearAll"
        />
      </template>
    </HeaderWithOptions>

    <div>
      <FacilityTaskPanel
        v-for="(task, idx) in tasks"
        :key="idx"
        :task="task"
      />
    </div>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import HeaderWithOptions from '../HeaderWithOptions';
  import taskStrings from '../taskStrings';
  import FacilityTaskPanel from './FacilityTaskPanel';
  import { taskPanelTasks } from './mockData';

  export default {
    name: 'FacilitiesTasksPage',
    components: {
      FacilityTaskPanel,
      HeaderWithOptions,
    },
    mixins: [commonCoreStrings],
    props: {},
    computed: {
      tasks() {
        return taskPanelTasks;
      },
    },
    methods: {
      taskString(...args) {
        return taskStrings.$tr(...args);
      },
      handleClickClearAll() {},
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

</style>
