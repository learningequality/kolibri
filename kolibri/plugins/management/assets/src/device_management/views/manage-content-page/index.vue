<template>

  <div>

    <template v-if="canManageContent">
      <component v-if="pageState.wizardState.shown" :is="wizardComponent" />

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
          <div class="buttons" v-if="!tasksInQueue">
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

    <auth-message v-else :details="$tr('noAccessDetails')" />

  </div>

</template>


<script>

  import { canManageContent } from 'kolibri.coreVue.vuex.getters';
  import { pollTasks, cancelTask } from '../../state/actions/taskActions';
  import { startImportWizard, startExportWizard } from '../../state/actions/contentWizardActions';
  import { ContentWizardPages } from '../../constants';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import channelsGrid from './channels-grid';
  import kButton from 'kolibri.coreVue.components.kButton';
  import wizardImportSource from './wizards/wizard-import-source';
  import wizardImportNetwork from './wizards/wizard-import-network';
  import wizardImportLocal from './wizards/wizard-import-local';
  import wizardExport from './wizards/wizard-export';
  import importPreview from './wizards/import-preview';
  import subpageContainer from '../containers/subpage-container';
  import taskProgress from './task-progress';
  import { refreshChannelList } from '../../state/actions/manageContentActions';

  const pageNameComponentMap = {
    [ContentWizardPages.CHOOSE_IMPORT_SOURCE]: 'wizard-import-source',
    [ContentWizardPages.IMPORT_NETWORK]: 'wizard-import-network',
    [ContentWizardPages.IMPORT_LOCAL]: 'wizard-import-local',
    [ContentWizardPages.EXPORT]: 'wizard-export',
    [ContentWizardPages.LOCAL_IMPORT_PREVIEW]: 'import-preview',
    [ContentWizardPages.REMOTE_IMPORT_PREVIEW]: 'import-preview',
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
      channelsGrid,
      kButton,
      importPreview,
      subpageContainer,
      taskProgress,
      wizardImportSource,
      wizardImportNetwork,
      wizardImportLocal,
      wizardExport,
    },
    data: () => ({
      intervalId: undefined,
      notification: null,
    }),
    computed: {
      wizardComponent() {
        return pageNameComponentMap[this.pageState.wizardState.page];
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
        this.intervalId = setInterval(this.pollTasks, POLL_DELAY);
      }
    },
    destroyed() {
      clearInterval(this.intervalId);
    },
    methods: {
      openWizard(action) {
        if (action === 'import') {
          return this.startImportWizard();
        }
        return this.startExportWizard();
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
      },
      actions: {
        cancelTask,
        pollTasks,
        refreshChannelList,
        startExportWizard,
        startImportWizard,
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
