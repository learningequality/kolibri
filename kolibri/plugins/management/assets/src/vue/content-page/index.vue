<template>

  <div>

    <task-status v-if="pageState.taskList.length"
      :type="pageState.taskList[0].type"
      :status="pageState.taskList[0].status"
      :percentage="pageState.taskList[0].percentage"
      :id="pageState.taskList[0].id"
    ></task-status>


    <div>
      <button @click="startImportWizard">Import</button>
      <button @click="startExportWizard">Export</button>
    </div>

    <component v-if="pageState.wizardState.shown" :is="wizardComponent"></component>

    <h1>My Channels</h1>
    <ul>
      <li v-for="channel in pageState.channelList">{{ channel.name }}</li>
    </ul>
    <p v-if="!pageState.channelList.length">No channels installed</p>

  </div>

</template>


<script>

  const actions = require('../../actions');
  const ContentWizardPages = require('../../state/constants').ContentWizardPages;

  module.exports = {
    components: {
      'icon-button': require('kolibri/coreVue/components/iconButton'),
      'task-status': require('./task-status'),
      'wizard-import-source': require('./wizard-import-source'),
      'wizard-import-network': require('./wizard-import-network'),
      'wizard-import-local': require('./wizard-import-local'),
      'wizard-export': require('./wizard-export'),
    },
    data: () => ({
      intervalId: undefined,
    }),
    attached() {
      this.intervalId = setInterval(this.pollTasksAndChannels, 1000);
    },
    detached() {
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


<style lang="stylus" scoped></style>
