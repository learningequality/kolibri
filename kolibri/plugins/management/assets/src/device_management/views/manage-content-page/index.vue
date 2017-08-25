<template>

  <div>

    <template v-if="isSuperuser || canManageContent">
      <component v-if="pageState.wizardState.shown" :is="wizardComponent"/>

      <subpage-container>
        <div v-if="tasksInQueue" class="alert-bg">
          <task-status
            :type="firstTask.type"
            :status="firstTask.status"
            :percentage="firstTask.percentage"
            :id="firstTask.id"
            @importsuccess="notification=notificationTypes.CHANNEL_IMPORT_SUCCESS"
          />
        </div>

        <notifications
          v-bind="{notification}"
          @dismiss="notification=null"
        />

        <div class="table-title">
          <h1 class="page-title">{{$tr('title')}}</h1>
          <div class="button-wrapper" v-if="!tasksInQueue">
            <k-button
              :text="$tr('import')"
              class="button"
              @click="openWizard('import')"
              :primary="true"/>
            <k-button
              :text="$tr('export')"
              class="button"
              :primary="true"
              @click="openWizard('export')"/>
          </div>
        </div>

        <hr />

        <channels-grid
          @deletesuccess="notification=notificationTypes.CHANNEL_DELETE_SUCCESS"
          @deletefailure="notification=notificationTypes.CHANNEL_DELETE_FAILURE"
        />
      </subpage-container>
    </template>

    <auth-message
      v-else
      :header="$tr('noAccessHeader')"
      :details="$tr('noAccessDetails')"
    />

  </div>

</template>


<script>

  import { isSuperuser, canManageContent } from 'kolibri.coreVue.vuex.getters';
  import * as taskActions from '../../state/actions/taskActions';
  import * as contentWizardActions from '../../state/actions/contentWizardActions';
  import { ContentWizardPages, notificationTypes } from '../../constants';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import channelsGrid from './channels-grid';
  import kButton from 'kolibri.coreVue.components.kButton';
  import notifications from './manage-content-notifications';
  import taskStatus from './task-status';
  import wizardImportSource from './wizards/wizard-import-source';
  import wizardImportNetwork from './wizards/wizard-import-network';
  import wizardImportLocal from './wizards/wizard-import-local';
  import wizardExport from './wizards/wizard-export';
  import importPreview from './wizards/import-preview';
  import subpageContainer from '../containers/subpage-container';

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
      noAccessHeader: 'You do not have access to this page',
      noAccessDetails: 'You must be a Superuser or have Content Management permissions to view this page',
    },
    components: {
      authMessage,
      channelsGrid,
      kButton,
      notifications,
      importPreview,
      subpageContainer,
      taskStatus,
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
      this.intervalId = setInterval(this.pollTasksAndChannels, 1000);
    },
    destroyed() {
      clearInterval(this.intervalId);
    },
    methods: {
      openWizard(action) {
        this.notification = null;
        if (action === 'import') {
          return this.startImportWizard();
        }
        return this.startExportWizard();
      },
    },
    vuex: {
      getters: {
        isSuperuser,
        canManageContent,
        pageState: ({ pageState }) => pageState,
        firstTask: ({ pageState }) => pageState.taskList[0],
        tasksInQueue: ({ pageState }) => pageState.taskList.length > 0,
      },
      actions: {
        startImportWizard: contentWizardActions.startImportWizard,
        startExportWizard: contentWizardActions.startExportWizard,
        pollTasksAndChannels: taskActions.pollTasksAndChannels,
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

  .button-wrapper
    float: right

  hr
    background-color: $core-text-annotation
    height: 1px
    border: none

  @media screen and (max-width: 620px)
    .page-title
      float: none
      margin: 0.4em 0

    .button-wrapper
      float: none

    .button
      margin: 5px

</style>
