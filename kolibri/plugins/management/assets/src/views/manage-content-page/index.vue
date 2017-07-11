<template>

  <div>

    <template v-if="isSuperuser">
      <component v-if="pageState.wizardState.shown" :is="wizardComponent"/>

      <div v-if="pageState.taskList.length" class="main alert-bg">
        <task-status
          :type="pageState.taskList[0].type"
          :status="pageState.taskList[0].status"
          :percentage="pageState.taskList[0].percentage"
          :id="pageState.taskList[0].id"
          @importsuccess="notification=notificationTypes.CHANNEL_IMPORT_SUCCESS"
        />
      </div>

      <notifications
        v-bind="{notification}"
        @dismiss="notification=null"
      />

      <div class="main light-bg">
        <div class="table-title">
          <h1 class="page-title">{{$tr('title')}}</h1>
          <div class="button-wrapper" v-if="!pageState.taskList.length">
            <icon-button
              :text="$tr('import')"
              class="button"
              @click="openWizard('import')"
              :primary="true">
              <mat-svg category="content" name="add"/>
            </icon-button>
            <icon-button
              :text="$tr('export')"
              class="button"
              :primary="true"
              @click="openWizard('export')">
              <ion-svg name="ios-upload-outline"/>
            </icon-button>
          </div>
        </div>
        <hr>

        <channels-grid
          @deletesuccess="notification=notificationTypes.CHANNEL_DELETE_SUCCESS"
          @deletefailure="notification=notificationTypes.CHANNEL_DELETE_FAILURE"
        />
      </div>
    </template>
    <auth-message v-else :header="$tr('notAdminHeader')" :details="$tr('notAdminDetails')" />

  </div>

</template>


<script>

  import { isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import * as actions from '../../state/actions';
  import { ContentWizardPages, notificationTypes } from '../../constants';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import channelsGrid from './channels-grid';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  import notifications from './manage-content-notifications';
  import taskStatus from './task-status';
  import wizardImportSource from './wizard-import-source';
  import wizardImportNetwork from './wizard-import-network';
  import wizardImportLocal from './wizard-import-local';
  import wizardExport from './wizard-export';
  import previewImportWizard from './wizards/preview-import-wizard';

  export default {
    $trNameSpace: 'manageContentState',
    $trs: {
      title: 'My channels',
      import: 'Import',
      export: 'Export',
      notAdminHeader: 'You need to sign in as the Device Owner to manage content',
      notAdminDetails: 'The Device Owner is the account originally created in the Setup Wizard',
    },
    components: {
      authMessage,
      channelsGrid,
      iconButton,
      notifications,
      previewImportWizard,
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
    mounted() {
      if (this.isSuperuser) {
        this.intervalId = setInterval(this.pollTasksAndChannels, 1000);
      }
    },
    destroyed() {
      if (this.isSuperuser) {
        clearInterval(this.intervalId);
      }
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
    computed: {
      notificationTypes: () => notificationTypes,
      wizardComponent() {
        switch (this.pageState.wizardState.page) {
          case ContentWizardPages.CHOOSE_IMPORT_SOURCE:
            return 'wizard-import-source';
          case ContentWizardPages.IMPORT_NETWORK:
            return 'wizard-import-network';
          case ContentWizardPages.IMPORT_LOCAL:
            return 'wizard-import-local';
          case ContentWizardPages.EXPORT:
            return 'wizard-export';
          case ContentWizardPages.LOCAL_IMPORT_PREVIEW:
          case ContentWizardPages.REMOTE_IMPORT_PREVIEW:
            return 'preview-import-wizard';
          default:
            return undefined;
        }
      },
    },
    vuex: {
      getters: {
        isSuperuser,
        pageState: state => state.pageState,
      },
      actions: {
        startImportWizard: actions.startImportWizard,
        startExportWizard: actions.startExportWizard,
        pollTasksAndChannels: actions.pollTasksAndChannels,
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

  .main
    padding: 1em 2em
    padding-bottom: 3em
    margin-top: 2em
    width: 100%
    border-radius: 4px

  .light-bg
    background-color: $core-bg-light

  .alert-bg
    background-color: $core-bg-warning

  .table-title
    margin-top: 1em

  .table-title:after
    content: ''
    display: table
    clear: both

  .page-title
    float: left
    margin: 0.2em

  .button-wrapper
    float: right

  table
    width: 100%

  hr
    background-color: $core-text-annotation
    height: 1px
    border: none

  tr
    text-align: left

  .roster
    width: 100%
    word-break: break-all

  th
    text-align: inherit

  .col-header
    padding-bottom: (1.2 * $row-padding)
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%

  .col-channel
    width: 90%

  .col-export
    width: 10%

  .table-cell
    font-weight: normal // compensates for <th> cells
    padding-bottom: $row-padding
    color: $core-text-default

  .channel-name
    font-weight: 700

  .table-export
    padding-left: 0.6em

  @media screen and (max-width: 620px)
    .page-title
      float: none
      margin: 0.4em 0

    .button-wrapper
      float: none

      .button
        margin: 5px

</style>
