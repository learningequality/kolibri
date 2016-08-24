<template>

  <div>

    <task-status v-if="pageState.taskList.length"
      :type="pageState.taskList[0].type"
      :status="pageState.taskList[0].status"
      :percentage="pageState.taskList[0].percentage"
      :id="pageState.taskList[0].id"
    ></task-status>

    <button @click="incrementDebugTask">next task</button>

    <hr>

    <icon-button v-if="!pageState.taskList.length" text="Add Channel" :primary="true" @click="startImportWizard">
      <svg src="../icons/add.svg"></svg>
    </icon-button>

    <component v-if="pageState.wizardState.shown" :is="wizardComponent"></component>

    <h1>My Channels</h1>
    <ul>
      <li v-for="channel in pageState.localChannels">{{ channel.name }}</li>
    </ul>

  </div>

</template>


<script>

  const debugTasks = [
    {},
    {
      percentage: 0.5,
      status: 'in_progress',
      type: 'local_export',
      id: '12345678901234567890',
      metadata: {},
    },
    {
      percentage: 0.0,
      status: 'pending',
      type: 'local_export',
      id: '12345678901234567890',
      metadata: {},
    },
    {
      percentage: 0.3,
      status: 'error',
      type: 'local_export',
      id: '12345678901234567890',
      metadata: {},
    },
    {
      percentage: 1.0,
      status: 'success',
      type: 'local_export',
      id: '12345678901234567890',
      metadata: {},
    },
  ];

  const actions = require('../../actions');
  const ContentWizardPages = require('../../state/constants').ContentWizardPages;

  module.exports = {
    components: {
      'icon-button': require('icon-button'),
      'task-status': require('./task-status'),
      'wizard-import-source': require('./wizard-import-source'),
      'wizard-import-network': require('./wizard-import-network'),
      'wizard-import-local': require('./wizard-import-local'),
      'wizard-export': require('./wizard-export'),
    },
    data: () => ({
      i: 0, // TODO - remove debuging
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
        incrementDebugTask(state) { // TODO - remove debuging
          this.i = (this.i + 1) % debugTasks.length;
          if (this.i) {
            state.dispatch('SET_CONTENT_PAGE_TASKS', [debugTasks[this.i]]);
            state.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', false, {});
          } else {
            state.dispatch('SET_CONTENT_PAGE_TASKS', []);
          }
        },
        startImportWizard: actions.startImportWizard,
        pollTasksAndChannels: actions.pollTasksAndChannels,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
