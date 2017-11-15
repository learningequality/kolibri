<template>

  <div>
    <template v-if="canManageContent">
      <component
        v-if="wizardPageName!==''"
        :is="wizardComponent"
      />

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
              :primary="true"
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
  import { refreshTaskList, cancelTask } from '../../state/actions/taskActions';
  import { transitionWizardPage } from '../../state/actions/contentWizardActions';
  import { ContentWizardPages } from '../../constants';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import channelsGrid from './channels-grid';
  import kButton from 'kolibri.coreVue.components.kButton';
  import availableChannelsPage from '../available-channels-page';
  import selectImportSource from './wizards/select-import-source-modal';
  import subpageContainer from '../containers/subpage-container';
  import taskProgress from './task-progress';
  import selectDriveModal from './wizards/select-drive-modal';
  import selectContentPage from '../select-content-page';
  import { refreshChannelList } from '../../state/actions/manageContentActions';

  const pageNameComponentMap = {
    [ContentWizardPages.SELECT_IMPORT_SOURCE]: 'selectImportSource',
    [ContentWizardPages.SELECT_DRIVE]: 'selectDriveModal',
    [ContentWizardPages.AVAILABLE_CHANNELS]: 'availableChannelsPage',
    [ContentWizardPages.SELECT_CONTENT]: 'selectContentPage',
  };

  const POLL_DELAY = 1000;

  export default {
    name: 'manageContentPage',
    $trs: {
      title: 'Content',
      import: 'Import',
      export: 'Export',
      noAccessDetails:
        'You must be a signed in as a Superuser or have Content Management permissions to view this page',
    },
    components: {
      authMessage,
      availableChannelsPage,
      channelsGrid,
      kButton,
      selectDriveModal,
      selectContentPage,
      subpageContainer,
      taskProgress,
      selectImportSource,
    },
    data: () => ({
      intervalId: undefined,
      notification: null,
    }),
    computed: {
      wizardComponent() {
        return pageNameComponentMap[this.wizardPageName];
      },
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
        if (action === 'import') {
          return this.transitionWizardPage('forward', { import: true });
        }
        return this.transitionWizardPage('forward', { import: false });
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
        wizardPageName: ({ pageState }) => pageState.wizardState.pageName,
        pageState: ({ pageState }) => pageState,
        firstTask: ({ pageState }) => pageState.taskList[0],
        tasksInQueue: ({ pageState }) => pageState.taskList.length > 0,
        deviceHasChannels: ({ pageState }) => pageState.channelList.length > 0,
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
