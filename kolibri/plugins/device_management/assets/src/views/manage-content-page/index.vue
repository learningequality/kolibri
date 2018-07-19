<template>

  <div>
    <template v-if="canManageContent">
      <select-transfer-source-modal v-if="wizardPageName!==''" />

      <div>
        <task-progress
          v-if="firstTask"
          v-bind="firstTask"
          @cleartask="clearFirstTask"
        />

        <k-grid>
          <k-grid-item sizes="100, 50, 50" percentage>
            <h1>{{ $tr('title') }}</h1>
          </k-grid-item>
          <k-grid-item
            sizes="100, 50, 50"
            alignments="left, right, right"
            percentage
            v-if="!tasksInQueue"
          >
            <k-button
              :text="$tr('import')"
              @click="startImportWorkflow()"
              :primary="true"
            />
            <k-button
              v-if="deviceHasChannels"
              :text="$tr('export')"
              @click="startExportWorkflow()"
              class="flush-right"
            />
          </k-grid-item>
        </k-grid>

        <channels-grid />

      </div>
    </template>

    <auth-message
      v-else
      :details="$tr('noAccessDetails')"
    />

  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kGrid from 'kolibri.coreVue.components.kGrid';
  import kGridItem from 'kolibri.coreVue.components.kGridItem';
  import channelsGrid from './channels-grid';
  import taskProgress from './task-progress';
  import selectTransferSourceModal from './select-transfer-source-modal';

  export default {
    name: 'manageContentPage',
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
      authMessage,
      channelsGrid,
      kButton,
      kGrid,
      kGridItem,
      selectTransferSourceModal,
      taskProgress,
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
