<template>

  <div>
    <template v-if="canManageContent">
      <SelectTransferSourceModal :pageName="pageName" />

      <div>
        <TaskProgress
          v-if="activeTaskList[0]"
          v-bind="activeTaskList[0]"
          @cleartask="clearCompletedTasks"
          @canceltask="cancelRunningTask(activeTaskList[0].id)"
        />

        <KGrid>
          <KGridItem sizes="100, 50, 50" percentage>
            <h1>{{ coreString('channelsLabel') }}</h1>
          </KGridItem>
          <KGridItem
            v-if="!activeTaskList.length"
            sizes="100, 50, 50"
            alignments="left, right, right"
            percentage
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
    </template>

    <AuthMessage
      v-else
      :details="$tr('noAccessDetails')"
    />

  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
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
      AuthMessage,
      ChannelsGrid,
      KButton,
      KGrid,
      KGridItem,
      SelectTransferSourceModal,
      TaskProgress,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapGetters(['canManageContent']),
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
      noAccessDetails:
        'You must be signed in as a superuser or have content management permissions to view this page',
      documentTitle: 'Manage Device Channels',
    },
  };

</script>


<style lang="scss" scoped>

  .flush-right {
    margin-right: 0;
  }

</style>
