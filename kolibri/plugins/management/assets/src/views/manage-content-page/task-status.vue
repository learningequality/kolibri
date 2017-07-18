<template>

  <div class="task">
    <h1>{{ title }}</h1>
    <progress max="1" :value="percentage"></progress>
    <h2>{{ subTitle }}</h2>
    <p v-if="statusFailed">{{ $tr('failedMsg') }}</p>
    <icon-button class="buttons" @click="clearTaskHandler" :text="buttonMessage"/>
  </div>

</template>


<script>

  import * as manageContentActions from '../../state/manageContentActions';
  import * as actions from '../../state/actions';
  import * as constants from '../../constants';
  import logger from 'kolibri.lib.logging';
  const logging = logger.getLogger(__filename);
  const TaskTypes = constants.TaskTypes;
  const TaskStatuses = constants.TaskStatuses;
  import iconButton from 'kolibri.coreVue.components.iconButton';
  export default {
    name: 'contentPage',
    $trs: {
      buttonClose: 'Close',
      buttonCancel: 'Cancel',
      failed: 'Please try again',
      failedMsg:
        'The transfer did not succeed. Restart it to resume transferring the remaining content',
      completed: `Finished!`,
      loading: 'Please wait\u2026',
      remoteImport: 'Importing from curation server',
      localImport: 'Importing from local drive',
      localExport: 'Exporting to local drive',
    },
    components: { iconButton },
    computed: {
      buttonMessage() {
        if (this.status === TaskStatuses.FAILED || this.status === TaskStatuses.SUCCESS) {
          return this.$tr('buttonClose');
        }
        return this.$tr('buttonCancel');
      },
      statusFailed() {
        return this.status === TaskStatuses.FAILED;
      },
      statusSuccess() {
        return this.status === TaskStatuses.SUCCESS;
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
        if (this.statusFailed) {
          return this.$tr('failed');
        } else if (this.statusSuccess) {
          return this.$tr('completed');
        }
        return this.$tr('loading');
      },
    },
    methods: {
      clearTaskHandler() {
        if (this.statusSuccess) {
          this.$emit('importsuccess');
          this.refreshChannelList();
        }
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
        refreshChannelList: manageContentActions.refreshChannelList,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

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
