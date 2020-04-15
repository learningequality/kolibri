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
  import { syncStatusToDescriptionMap, removeStatusToDescriptionMap } from '../syncTaskUtils';
  import FacilityTaskPanel from './FacilityTaskPanel';

  // TODO remove these functions since they're just for generating examples
  function makeSyncTask(status) {
    return {
      type: 'SYNC_FACILITY',
      status,
      device_name: 'generic device',
      device_id: 'dev123',
      facility_name: 'generic facility',
      facility_id: 'fac123',
      started_by_username: 'generic user',
      bytes_sent: 1000000,
      bytes_received: 500000000,
      percentage: 0.6,
    };
  }

  function makeRemoveTask(status) {
    return {
      type: 'REMOVE_FACILITY',
      status,
      facility_name: 'removed facility',
      facility_id: 'fac123',
      started_by_username: 'removing user',
      percentage: 0.7,
    };
  }
  const syncExamples = [
    ...Object.keys(syncStatusToDescriptionMap).map(makeSyncTask),
    ...Object.keys(removeStatusToDescriptionMap).map(makeRemoveTask),
  ];

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
        return syncExamples;
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
