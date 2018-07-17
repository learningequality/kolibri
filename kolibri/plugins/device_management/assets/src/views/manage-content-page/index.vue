<template>

  <div>
    <template v-if="canManageContent">
      <select-transfer-source-modal v-if="wizardPageName!==''" />

      <subpage-container>
        <task-progress
          v-if="firstTask"
          v-bind="firstTask"
          @cleartask="clearFirstTask"
        />

        <div class="table-title">
          <h1 class="page-title">
            {{ $tr('title') }}
          </h1>
          <div
            class="buttons"
            v-if="!tasksInQueue"
          >
            <k-button
              :text="$tr('import')"
              class="button"
              @click="startImportWorkflow()"
              :primary="true"
            />
            <k-button
              v-if="deviceHasChannels"
              :text="$tr('export')"
              class="button"
              @click="startExportWorkflow()"
            />
          </div>
        </div>

        <channels-grid />

      </subpage-container>
    </template>

    <auth-message
      v-else
      :details="$tr('noAccessDetails')"
    />

  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import KButton from 'kolibri.coreVue.components.KButton';
  import subpageContainer from '../containers/SubpageContainer';
  import channelsGrid from './ChannelsGrid';
  import taskProgress from './TaskProgress';
  import selectTransferSourceModal from './SelectTransferSourceModal';

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
      channelsGrid,
      KButton,
      selectTransferSourceModal,
      subpageContainer,
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

  .table-title {
    margin-top: 16px;
    &::after {
      display: table;
      clear: both;
      content: '';
    }
  }

  .page-title {
    float: left;
  }

  .buttons {
    float: right;
  }

  .main {
    width: 100%;
    padding: 16px 32px;
    padding-bottom: 48px;
    margin-top: 32px;
    border-radius: 4px;
  }

</style>
