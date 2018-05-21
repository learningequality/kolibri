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
              @click="openWizard('import')"
              :primary="true"
            />
            <k-button
              v-if="deviceHasChannels"
              :text="$tr('export')"
              class="button"
              @click="openWizard('export')"
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
  import { refreshTaskList, cancelTask } from '../../state/actions/taskActions';
  import { transitionWizardPage, FORWARD } from '../../state/actions/contentWizardActions';
  import subpageContainer from '../containers/subpage-container';
  import { refreshChannelList } from '../../state/actions/manageContentActions';
  import channelsGrid from './channels-grid';
  import taskProgress from './task-progress';
  import selectTransferSourceModal from './select-transfer-source-modal';

  const POLL_DELAY = 1000;

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
      subpageContainer,
      taskProgress,
      selectTransferSourceModal,
    },
    data: () => ({
      intervalId: undefined,
      notification: null,
    }),
    watch: {
      // If Tasks disappear from queue, assume that an addition/deletion has
      // completed and refresh list.
      tasksInQueue(val, oldVal) {
        if (oldVal && !val) {
          this.refreshChannelList();
        }
      },
    },
    mounted() {
      if (this.canManageContent) {
        this.intervalId = setInterval(this.refreshTaskList, POLL_DELAY);
      }
    },
    destroyed() {
      clearInterval(this.intervalId);
    },
    methods: {
      openWizard(action) {
        return this.transitionWizardPage(FORWARD, { import: action === 'import' });
      },
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
        refreshTaskList,
        refreshChannelList,
        transitionWizardPage,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .table-title
    margin-top: 1em
    &:after
      content: ''
      display: table
      clear: both

  .page-title
    float: left

  .buttons
    float: right

  .main
    padding: 1em 2em
    padding-bottom: 3em
    margin-top: 2em
    width: 100%
    border-radius: 4px

  hr
    background-color: $core-text-annotation
    height: 1px
    border: none

</style>
