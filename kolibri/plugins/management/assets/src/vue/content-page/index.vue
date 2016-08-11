<template>

  <div>

    <button @click="incrementDebugTask">next task</button>

    <hr>

    <icon-button text="Add Channel" :primary="true">
      <svg src="../icons/add.svg"></svg>
    </icon-button>

    <div v-if="tasks.length">
      <ul>
        <li>Progress: {{ tasks[0].progress }}</li>
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
      progress: 0.5,
      status: 'in_progress',
      type: 'local_export',
      id: '12345678901234567890',
    },
    {
      progress: 0.0,
      status: 'pending',
      type: 'local_export',
      id: '12345678901234567890',
    },
    {
      progress: 0.3,
      status: 'error',
      type: 'local_export',
      id: '12345678901234567890',
    },
    {
      progress: 1.0,
      status: 'success',
      type: 'local_export',
      id: '12345678901234567890',
    },
  ];

  module.exports = {
    components: {
      'icon-button': require('icon-button'),
    },
    data: () => ({
      i: 0,
    }),
    vuex: {
      getters: {
        localChannels: state => state.pageState.channelList,
        tasks: state => state.pageState.taskList,
      },
      actions: {
        incrementDebugTask(state) {
          this.i = (this.i + 1) % tasks.length;
          if (this.i) {
            state.dispatch('SET_TASKS', [tasks[this.i]]);
          } else {
            state.dispatch('SET_TASKS', []);
          }
        },
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
