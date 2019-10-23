<template>

  <div>
    <SelectTransferSourceModal :pageName="pageName" />

    <div>
      <TaskProgress
        v-if="activeTaskList[0]"
        v-bind="activeTaskList[0]"
        @cleartask="clearCompletedTasks"
        @canceltask="cancelRunningTask(activeTaskList[0].id)"
      />

      <KGrid>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <h1>{{ coreString('channelsLabel') }}</h1>
        </KGridItem>
        <KGridItem
          v-if="!activeTaskList.length"
          :layout8="{ span: 4, alignment: 'right' }"
          :layout12="{ span: 6, alignment: 'right' }"
        >
          <KButton
            :text="$tr('import')"
            :primary="true"
            @click="startImportWorkflow()"
          />
          <KButton
            v-if="deviceHasChannels"
            :text="$tr('export')"
            class="flush-right"
            @click="startExportWorkflow()"
          />
        </KGridItem>
      </KGrid>

      <ChannelsGrid />

    </div>
  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import ChannelsGrid from './ChannelsGrid';
  import TaskProgress from './TaskProgress';
  import SelectTransferSourceModal from './SelectTransferSourceModal';

  export default {
    name: 'ManageContentPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      ChannelsGrid,
      SelectTransferSourceModal,
      TaskProgress,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapGetters('manageContent', ['activeTaskList']),
      ...mapState('manageContent/wizard', ['pageName']),
      ...mapState('manageContent', {
        deviceHasChannels: state => state.channelList.length > 0,
      }),
    },
    watch: {
      // If Tasks disappear from queue, assume that an addition/deletion has
      // completed and refresh list.
      tasksInQueue(val, oldVal) {
        if (oldVal && !val) {
          this.refreshChannelList();
        }
      },
    },
    methods: {
      ...mapActions('manageContent', [
        'cancelTask',
        'refreshChannelList',
        'startImportWorkflow',
        'startExportWorkflow',
      ]),
      cancelRunningTask(taskId) {
        this.cancelTask(taskId)
          // Handle failures silently in case of near-simultaneous cancels.
          .catch(() => {});
      },
      clearCompletedTasks() {
        return TaskResource.deleteFinishedTasks();
      },
    },
    $trs: {
      import: 'Import',
      export: 'Export',
      documentTitle: 'Manage Device Channels',
    },
  };

</script>


<style lang="scss" scoped>

  .flush-right {
    margin-right: 0;
  }

</style>
