<template>

  <div class="task-progress">
    <div class="progress-bar dtc">
      <div class="task-stage">
        {{ stageText }}
      </div>
      <ui-progress-linear
        class="progress-linear"
        :progress="formattedPercentage"
        :type="progressBarType"
        color="primary"
      />
    </div>

    <div class="progress-messages dtc">
      <span class="percentage">{{ progressMessage }}</span>
    </div>

    <div class="buttons dtc">
      <k-button
        :text="status==='COMPLETED' ? $tr('close') : $tr('cancel')"
        :primary="false"
        :raised="false"
        @click="cancelTaskHandler()"
      />
    </div>

  </div>

</template>


<script>

  import UiProgressLinear from 'keen-ui/src/UiProgressLinear';
  import kButton from 'kolibri.coreVue.components.kButton';
  import round from 'lodash/round';
  import { refreshChannelList } from '../../state/actions/manageContentActions';
  import { cancelTask } from '../../state/actions/taskActions';

  export default {
    name: 'taskProgress',
    components: {
      UiProgressLinear,
      kButton,
    },
    props: ['percentage', 'status', 'type', 'id'],
    computed: {
      stageText() {
        if (this.status === 'RUNNING') {
          switch (this.type) {
            case 'remoteimport':
            case 'localimport':
              return this.$tr('importingContent');
            case 'localexport':
              return this.$tr('exportingContent');
            default:
              return '';
          }
        }
        if (this.taskIsCompleted) {
          return this.$tr('finished');
        }
        if (this.isIndeterminateStatus) {
          return this.$tr('gettingReady');
        }
      },
      taskIsCompleted() {
        return this.status === 'COMPLETED';
      },
      // statuses used before transfer actually begins
      isIndeterminateStatus() {
        return this.status === 'QUEUED' || this.status === 'SCHEDULED';
      },
      formattedPercentage() {
        return round(this.percentage * 100, 2);
      },
      progressMessage() {
        if (this.percentage > 0) {
          return this.formattedPercentage + '%';
        }
        return '';
      },
      progressBarType() {
        return this.isIndeterminateStatus ? 'indeterminate' : 'determinate';
      },
    },
    methods: {
      cancelTaskHandler() {
        if (this.taskIsCompleted) {
          this.$emit('importsuccess');
          this.refreshChannelList();
        }
        this.cancelTask(this.id);
      },
    },
    vuex: {
      actions: {
        cancelTask,
        refreshChannelList,
      },
    },
    $trs: {
      importingContent: 'Importing content...',
      exportingContent: 'Exporting content...',
      finished: 'Finished!',
      gettingReady: 'Getting ready...',
      close: 'Close',
      cancel: 'Cancel',
    },
  };

</script>


<style lang="stylus" scoped>

  .task-progress
    display: table
    width: 100%
    height: 5em
    vertical-align: middle
    padding-left: 1em
    padding-right: 1em

  .task-stage
    margin-bottom: 0.5em

  .progress-bar
    width: 50%
    font-size: 0.75em
    padding-bottom: 10px

  .progress-messages
    padding-left: 1em
    padding-right: 1em

  .percentage
    font-weight: bold

  .buttons
    text-align: right

  .dtc
    display: table-cell
    vertical-align: inherit

</style>
