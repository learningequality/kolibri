<template>

  <div>

    <template v-if="canManageContent">
      <component v-if="pageState.wizardState.shown" :is="wizardComponent"/>

      <subpage-container>
        <task-progress
          v-if="tasksInQueue"
          v-bind="firstTask"
          @taskcomplete="showTaskCompleteNotification()"
          @taskfailed="showTaskFailedNotification()"
        />

        <notifications v-bind="{notification}" @dismiss="clearNotification()" />

        <div class="table-title">
          <h1 class="page-title">{{$tr('title')}}</h1>
          <div class="buttons" v-if="!tasksInQueue">
            <k-button
              :text="$tr('import')"
              class="button"
              @click="openWizard('import')"
              :primary="true"
            />
            <k-button
              v-show="deviceHasChannels"
              :text="$tr('export')"
              class="button"
              :primary="true"
              @click="openWizard('export')"
            />
          </div>
        </div>

        <hr />

        <channels-grid/>
      </subpage-container>
    </template>

    <auth-message v-else :details="$tr('noAccessDetails')" />

  </div>

</template>


<script>

  import { canManageContent } from 'kolibri.coreVue.vuex.getters';
  import { pollTasks } from '../../state/actions/taskActions';
  import { startImportWizard, startExportWizard } from '../../state/actions/contentWizardActions';
  import { ContentWizardPages, notificationTypes } from '../../constants';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import channelsGrid from './channels-grid';
  import kButton from 'kolibri.coreVue.components.kButton';
  import notifications from './manage-content-notifications';
  import wizardImportSource from './wizards/wizard-import-source';
  import wizardImportNetwork from './wizards/wizard-import-network';
  import wizardImportLocal from './wizards/wizard-import-local';
  import wizardExport from './wizards/wizard-export';
  import importPreview from './wizards/import-preview';
  import subpageContainer from '../containers/subpage-container';
  import taskProgress from './task-progress';

  const pageNameComponentMap = {
    [ContentWizardPages.CHOOSE_IMPORT_SOURCE]: 'wizard-import-source',
    [ContentWizardPages.IMPORT_NETWORK]: 'wizard-import-network',
    [ContentWizardPages.IMPORT_LOCAL]: 'wizard-import-local',
    [ContentWizardPages.EXPORT]: 'wizard-export',
    [ContentWizardPages.LOCAL_IMPORT_PREVIEW]: 'import-preview',
    [ContentWizardPages.REMOTE_IMPORT_PREVIEW]: 'import-preview',
  };

  export default {
    name: 'manageContentState',
    $trs: {
      title: 'My channels',
      import: 'Import',
      export: 'Export',
      noAccessDetails:
        'You must be a signed in as a Superuser or have Content Management permissions to view this page',
    },
    components: {
      authMessage,
      channelsGrid,
      kButton,
      notifications,
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
      notificationTypes: () => notificationTypes,
      wizardComponent() {
        return pageNameComponentMap[this.pageState.wizardState.page];
      },
    },
    mounted() {
      if (this.canManageContent) {
        this.intervalId = setInterval(this.pollTasks, 1000);
      }
    },
    destroyed() {
      clearInterval(this.intervalId);
    },
    methods: {
      openWizard(action) {
        this.clearNotification();
        if (action === 'import') {
          return this.startImportWizard();
        }
        return this.startExportWizard();
      },
      clearNotification() {
        this.notification = null;
      },
      showTaskCompleteNotification() {
        switch (this.firstTask.type) {
          case 'remoteimport':
          case 'localimport':
            this.notification = notificationTypes.CHANNEL_IMPORT_SUCCESS;
            break;
          case 'localexport':
            this.notification = notificationTypes.CHANNEL_EXPORT_SUCCESS;
            break;
          case 'deletechannel':
            this.notification = notificationTypes.CHANNEL_DELETE_SUCCESS;
            break;
          default:
            this.notification = null;
        }
      },
      showTaskFailedNotification() {
        switch (this.firstTask.type) {
          case 'remoteimport':
          case 'localimport':
            this.notification = notificationTypes.CHANNEL_IMPORT_FAILURE;
            break;
          case 'localexport':
            this.notification = notificationTypes.CHANNEL_EXPORT_FAILURE;
            break;
          case 'deletechannel':
            this.notification = notificationTypes.CHANNEL_DELETE_FAILURE;
            break;
          default:
            this.notification = null;
        }
      },
    },
    vuex: {
      getters: {
        canManageContent,
        pageState: ({ pageState }) => pageState,
        firstTask: ({ pageState }) => pageState.taskList[0],
        tasksInQueue: ({ pageState }) => pageState.taskList.length > 0,
        deviceHasChannels: ({ pageState }) => pageState.channelList > 0,
      },
      actions: {
        startImportWizard,
        startExportWizard,
        pollTasks,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // Padding height that separates rows from eachother
  $row-padding = 1.5em
  // height of elements in toolbar,  based off of icon-button height
  $toolbar-height = 36px

  .alert-bg
    background-color: $core-bg-warning

  .table-title
    margin-top: 1em
    &:after
      content: ''
      display: table
      clear: both

  .page-title
    float: left
    margin: 0.2em

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

  @media screen and (max-width: 620px)
    .page-title
      float: none
      margin: 0.4em 0

    .buttons
      float: none

    .button
      margin: 5px

</style>
