<template>

  <div class="task">
    <h1>{{ title }}</h1>
    <progress max="1" :value="percentage"></progress>
    <h2>{{ subTitle }}</h2>
    <button class="buttons" @click="clearTaskHandler">
      {{ buttonMessage }}
    </button>
  </div>

</template>


<script>

  const actions = require('../../actions');
  const logging = require('kolibri/lib/logging');
  const constants = require('../../state/constants');
  const TaskTypes = constants.TaskTypes;
  const TaskStatuses = constants.TaskStatuses;

  module.exports = {
    $trNameSpace: 'contentPage',
    $trs: {
      buttonClose: 'Close',
      buttonCancel: 'Cancel',
      failed: 'Failed.',
      completed: `Finished!`,
      loading: 'Please wait...',
      remoteImport: 'Importing from Curation Server',
      localImport: 'Importing from Local Drive',
      localExport: 'Exporting to Local Drive',
    },
    computed: {
      buttonMessage() {
        if (this.status === TaskStatuses.FAILED || this.status === TaskStatuses.SUCCESS) {
          return this.$tr('buttonClose');
        }
        return this.$tr('buttonCancel');
      },
      title() {
        switch (this.type) {
          case TaskTypes.REMOTE_IMPORT:
            return this.$tr('remoteImport');
          case TaskTypes.LOCAL_IMPORT:
            return this.$tr('localImport');
          case TaskTypes.LOCAL_EXPORT:
            return this.$tr('localExport');
          default:
            logging.error(`unknown task type: ${this.type}`);
            return undefined;
        }
      },
      subTitle() {
        if (this.status === TaskStatuses.FAILED) {
          return this.$tr('failed');
        } else if (this.status === TaskStatuses.SUCCESS) {
          return this.$tr('completed');
        }
        return this.$tr('loading');
      },
    },
    methods: {
      clearTaskHandler() {
        this.clearTask(this.id);
      },
    },
    props: {
      type: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        required: true,
      },
      percentage: {
        type: Number,
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
    },
    vuex: {
      actions: {
        clearTask: actions.clearTask,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  .buttons
    margin: 10px
    text-align: center

  .task
    text-align: center

  progress
    width: 100%
    height: 16px
    -webkit-appearance: none
    -moz-appearance: none
    appearance: none
    border: none
    color: $core-action-normal

  progress[value]::-webkit-progress-bar
    border-radius: 50px

  progress[value]::-webkit-progress-value
    background-color: $core-action-normal
    border-radius: 50px

</style>
