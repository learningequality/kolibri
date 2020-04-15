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
          :text="getTaskString('clearCompletedTasksAction')"
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
  import commonTaskStrings from 'kolibri.coreVue.mixins.commonTaskStrings';
  import HeaderWithOptions from '../HeaderWithOptions';
  import FacilityTaskPanel from './FacilityTaskPanel';
  import { taskPanelTasks } from './mockData';

  export default {
    name: 'FacilitiesTasksPage',
    components: {
      FacilityTaskPanel,
      HeaderWithOptions,
    },
    mixins: [commonCoreStrings, commonTaskStrings],
    props: {},
    computed: {
      tasks() {
        return taskPanelTasks;
      },
    },
    methods: {
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
