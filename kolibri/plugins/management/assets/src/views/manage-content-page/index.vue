<template>

  <div>

    <component v-if="pageState.wizardState.shown" :is="wizardComponent"/>

    <div v-if="pageState.taskList.length > 0" class="main alert-bg">
      <task-status
        :type="pageState.taskList[0].type"
        :status="pageState.taskList[0].status"
        :percentage="pageState.taskList[0].percentage"
        :id="pageState.taskList[0].id"
      />
    </div>

    <div class="light-bg">
      <div class="table-title">
        <h1 class="page-title">{{$tr('title')}}</h1>
        <div class="button-wrapper" v-if="!pageState.taskList.length">
          <icon-button
            :text="$tr('import')"
            class="button"
            @click="startImportWizard"
            :primary="true">
            <mat-svg category="content" name="add"/>
          </icon-button>
          <icon-button
            :text="$tr('export')"
            class="button"
            :primary="true"
            @click="startExportWizard">
            <ion-svg name="ios-upload-outline"/>
          </icon-button>
        </div>
      </div>
      <hr>

      <channels-grid v-if="channelList.length > 0" />

      <p v-else class="core-text-alert">
        {{ $tr('noChannels') }}
      </p>

    </div>

  </div>

</template>


<script>

  const actions = require('../../state/actions');
  const ContentWizardPages = require('../../constants').ContentWizardPages;

  module.exports = {
    $trNameSpace: 'manageContentState',
    $trs: {
      title: 'My channels',
      import: 'Import',
      export: 'Export',
      noChannels: 'No channels installed',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'task-status': require('./task-status'),
      'wizard-import-source': require('./wizard-import-source'),
      'wizard-import-network': require('./wizard-import-network'),
      'wizard-import-local': require('./wizard-import-local'),
      'wizard-export': require('./wizard-export'),
      'channels-grid': require('./channels-grid'),
    },
    data: () => ({
      intervalId: undefined,
    }),
    mounted() {
      this.intervalId = setInterval(this.pollTasksAndChannels, 1000);
    },
    destroyed() {
      clearInterval(this.intervalId);
    },
    computed: {
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
          default:
            return undefined;
        }
      },
    },
    vuex: {
      getters: {
        channelList: state => state.core.channels.list,
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
