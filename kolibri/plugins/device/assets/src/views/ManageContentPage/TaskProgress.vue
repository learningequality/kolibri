<template>

  <transition name="fade">
    <div class="task-progress">
      <div class="dtc progress-bar">
        <div class="task-stage">
          {{ stageText }}
        </div>
        <KLinearLoader
          type="indeterminate"
          :delay="true"
        />
      </div>
    </div>
  </transition>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'TaskProgress',
    mixins: [commonCoreStrings],
    computed: {
      stageText() {
        return this.$tr('downloadingChannelContents');
      },
    },
    $trs: {
      downloadingChannelContents: {
        message: 'Generating channel listing. This could take a few minutes',
        context:
          'Text in the task manager panel indicating that a channel listing is being created.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .progress-icon {
    position: relative;
    top: -2px;
    width: 5%;
    text-align: center;

    .inprogress {
      display: inline-block;
    }
  }

  .task-progress {
    display: table;
    width: 100%;
    height: 5em;
    margin-left: -6px;
    vertical-align: middle;
  }

  .task-stage {
    margin-bottom: 0.5em;
  }

  .progress-bar {
    width: 50%;
    padding-bottom: 8px;
    padding-left: 8px;
    font-size: 0.75em;
  }

  .progress-messages {
    padding-left: 16px;
  }

  .percentage {
    font-weight: bold;
  }

  .buttons {
    text-align: right;
  }

  .dtc {
    display: table-cell;
    vertical-align: inherit;
  }

  .btn {
    margin: 0;
  }

  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s;
  }

</style>
