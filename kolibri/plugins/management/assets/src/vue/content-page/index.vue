<template>

  <div>

    <task-status v-if="tasks.length !== 0">
    </task-status>

    <button @click="incrementDebugTask">next task</button>

    <hr>

    <icon-button v-if="!tasks.length" text="Add Channel" :primary="true" @click="startImportWizard">
      <svg src="../icons/add.svg"></svg>
    </icon-button>

    <component v-if="wizardState.shown" :is="wizardComponent"></component>

    <h1>My Channels</h1>
    <ul>
      <li v-for="channel in localChannels">{{ channel.name }}</li>
    </ul>

  </div>

</template>


<script>

  const tasks = [
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
        switch (this.wizardState.page) {
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
        localChannels: state => state.pageState.channelList,
        tasks: state => state.pageState.taskList,
        wizardState: state => state.pageState.wizardState,
      },
      actions: {
        incrementDebugTask(state) { // TODO - remove debuging
          this.i = (this.i + 1) % tasks.length;
          if (this.i) {
            state.dispatch('SET_CONTENT_PAGE_TASKS', [tasks[this.i]]);
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
