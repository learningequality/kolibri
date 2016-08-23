<template>

  <div v-if="showProgress" class="task">
    <h1>
      {{title}}
    </h1>
    <progress max="1" value={{taskProgress}}></progress>
    <h2>
      {{subTitle}}
    </h2>
    <button class="buttons" @click='hideProgressBar'>
      {{buttonMessage}}
    </button>
    </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
    },
    $trNameSpace: 'contentPage',
    $trs: {
      buttonConfirm: 'Confirm',
      buttonCancel: 'Cancel',
      failed: 'Please confirm and try again.',
      completed: `Please confirm to add channels to 'My Channels' list.`,
      loading: 'Please wait...',

    },
    data: () => ({
      showProgress: true,
    }),
    computed: {
      buttonMessage() {
        if (this.status === 'FAILED' || this.taskProgress === 1) {
          return this.$tr('buttonConfirm');
        }
        return this.$tr('buttonCancel');
      },
      subTitle() {
        if (this.status === 'FAILED') {
          return this.$tr('failed');
        } else if (this.taskProgress === 1) {
          return this.$tr('completed');
        }
        return this.$tr('loading');
      },
    },
    methods: {
      hideProgressBar() {
        if (this.showProgress) {
          this.showProgress = false;
          // this.clearTasks(this.id);
        } else {
          this.showProgress = true;
        }
      },
    },
    vuex: {
      getters: {
        title: state => state.pageState.taskList[0].type,
        status: state => state.pageState.taskList[0].status,
        taskProgress: state => state.pageState.taskList[0].percentage,
        id: state => state.pageState.taskList[0].id,
      },
      actions: {
        clearTasks: actions.clearTasks,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  div
    background-color: #ffffe6

  .buttons
    margin: 10px
    text-align: center

  .task
    text-align: center

  progress
    width: 100%

</style>
