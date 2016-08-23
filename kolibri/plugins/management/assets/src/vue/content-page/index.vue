<template>

  <div>

    <task-status v-if="tasks.length !== 0">
    </task-status>

    <button @click="incrementDebugTask">next task</button>

    <hr>

    <icon-button v-if="!tasks.length" text="Add Channel" :primary="true" @click="remoteImport">
      <svg src="../icons/add.svg"></svg>
    </icon-button>

    <wizard v-if="showWizard">
      Hello!
    </wizard>

    <div v-if="tasks.length">
      <ul>
        <li>Progress: {{ tasks[0].percentage }}</li>
        <li>Status: {{ tasks[0].status }}</li>
        <li>Type: {{ tasks[0].type }}</li>
      </ul>
    </div>

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

  module.exports = {
    components: {
      'icon-button': require('icon-button'),
      'wizard': require('./wizard'),
      'task-status': require('./task-status'),
    },
    data: () => ({
      i: 0,
      intervalId: undefined,
    }),
    attached() {
      this.intervalId = setInterval(this.updateTasks, 1000);
    },
    detached() {
      clearInterval(this.intervalId);
    },
    methods: {
      remoteImport() {
        this.downloadChannel('88623b4026f04df095604abf0f91ecfe');
      },
    },
    vuex: {
      getters: {
        localChannels: state => state.pageState.channelList,
        tasks: state => state.pageState.taskList,
        showWizard: state => state.pageState.showWizard,
      },
      actions: {
        incrementDebugTask(state) {
          this.i = (this.i + 1) % tasks.length;
          if (this.i) {
            state.dispatch('SET_TASKS', [tasks[this.i]]);
            state.dispatch('SET_CONTENT_WIZARD_STATE', false, {});
          } else {
            state.dispatch('SET_TASKS', []);
          }
        },
        startImportWizard: actions.startImportWizard,
        startExportWizard: actions.startExportWizard,
        downloadChannel: actions.remoteImportContent,
        updateTasks: actions.updateTasks,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
