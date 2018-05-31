<template>

  <div>
    <template v-if="canManageContent">
      <select-transfer-source-modal v-if="wizardPageName!==''" />

      <subpage-container>
        <task-progress
          v-if="tasksInQueue"
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

  import { canManageContent } from 'kolibri.coreVue.vuex.getters';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { cancelTask } from '../../state/actions/taskActions';
  import {
    startImportWorkflow,
    startExportWorkflow,
  } from '../../state/actions/contentWizardActions';
  import subpageContainer from '../containers/subpage-container';
  import { refreshChannelList } from '../../state/actions/manageContentActions';
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
    },
    components: {
      authMessage,
      channelsGrid,
      kButton,
      selectTransferSourceModal,
      subpageContainer,
      taskProgress,
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
      clearFirstTask(unblockCb) {
        this.cancelTask(this.firstTask.id)
          // Handle failures silently in case of near-simultaneous cancels.
          .catch(() => {})
          .then(() => {
            unblockCb();
          });
      },
    },
    vuex: {
      getters: {
        canManageContent,
        pageState: ({ pageState }) => pageState,
        firstTask: ({ pageState }) => pageState.taskList[0],
        tasksInQueue: ({ pageState }) => pageState.taskList.length > 0,
        deviceHasChannels: ({ pageState }) => pageState.channelList.length > 0,
        wizardPageName: ({ pageState }) => pageState.wizardState.pageName,
      },
      actions: {
        cancelTask,
        refreshChannelList,
        startImportWorkflow,
        startExportWorkflow,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .table-title
    margin-top: 16px
    &:after
      content: ''
      display: table
      clear: both

  .page-title
    float: left

  .buttons
    float: right

  .main
    padding: 16px 32px
    padding-bottom: 48px
    margin-top: 32px
    width: 100%
    border-radius: 4px

</style>
