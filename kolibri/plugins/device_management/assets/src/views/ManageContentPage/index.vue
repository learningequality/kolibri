<template>

  <div>
    <template v-if="canManageContent">
      <SelectTransferSourceModal v-if="wizardPageName!==''" />

      <div>
        <TaskProgress
          v-if="firstTask"
          v-bind="firstTask"
          @cleartask="clearFirstTask"
        />

        <KGrid>
          <KGridItem sizes="100, 50, 50" percentage>
            <h1>{{ $tr('title') }}</h1>
          </KGridItem>
          <KGridItem
            sizes="100, 50, 50"
            alignments="left, right, right"
            percentage
            v-if="!tasksInQueue"
          >
            <KButton
              :text="$tr('import')"
              @click="startImportWorkflow()"
              :primary="true"
            />
            <KButton
              v-if="deviceHasChannels"
              :text="$tr('export')"
              @click="startExportWorkflow()"
              class="flush-right"
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
  import ChannelsGrid from './ChannelsGrid';
  import TaskProgress from './TaskProgress';
  import SelectTransferSourceModal from './SelectTransferSourceModal';

  export default {
    name: 'ManageContentPage',
    $trs: {
      title: 'Content',
      import: 'Import',
      export: 'Export',
      noAccessDetails:
        'You must be signed in as a superuser or have content management permissions to view this page',
      documentTitle: 'Manage Device Content',
    },
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
    computed: {
      ...mapGetters(['canManageContent']),
      ...mapState({
        pageState: ({ pageState }) => pageState,
        firstTask: ({ pageState }) => pageState.taskList[0],
        tasksInQueue: ({ pageState }) => pageState.taskList.length > 0,
        deviceHasChannels: ({ pageState }) => pageState.channelList.length > 0,
        wizardPageName: ({ pageState }) => pageState.wizardState.pageName,
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
      ...mapActions([
        'cancelTask',
        'refreshChannelList',
        'startImportWorkflow',
        'startExportWorkflow',
      ]),
      clearFirstTask(unblockCb) {
        this.cancelTask(this.firstTask.id)
          // Handle failures silently in case of near-simultaneous cancels.
          .catch(() => {})
          .then(() => {
            unblockCb();
          });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .flush-right {
    margin-right: 0;
  }

</style>
