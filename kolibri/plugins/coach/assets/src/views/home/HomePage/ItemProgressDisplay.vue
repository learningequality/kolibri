<template>

  <div class="item-wrapper">
    <h3 class="title">{{ name }}</h3>
    <div class="context"><Recipients :groups="groups" /></div>

    <DashboardBar
      :completed="completed"
      :started="started"
      :total="completed + started + notStarted + needHelp"
      class="dashboard-bar"
    />

    <LearnerProgressRatio
      :count="completed"
      :total="completed + started + notStarted + needHelp"
      :verbosity="2"
      :icon="progressIcon"
      verb="completed"
      class="progress completed"
    />

    <LearnerProgressCount
      v-if="needHelp"
      :count="needHelp"
      :verbosity="0"
      icon="help"
      verb="needHelp"
      class="progress help"
    />

  </div>

</template>


<script>

  import commonCoach from '../../common';
  import DashboardBar from './DashboardBar';

  export default {
    name: 'ItemProgressDisplay',
    components: {
      DashboardBar,
    },
    mixins: [commonCoach],
    props: {
      name: {
        type: String,
        required: true,
      },
      groups: {
        type: Array,
        required: true,
      },
      completed: {
        type: Number,
        default: 0,
      },
      started: {
        type: Number,
        default: 0,
      },
      notStarted: {
        type: Number,
        default: 0,
      },
      needHelp: {
        type: Number,
        default: 0,
      },
      isLast: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      progressIcon() {
        if (this.completed === 0) {
          return 'nothing';
        }
        if (this.completed === this.total) {
          return 'star';
        }
        return 'clock';
      },
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    position: relative;
    top: -4px;
  }

  .item-wrapper {
    position: relative;
    height: 80px;
  }

  .context {
    position: absolute;
    top: 4px;
    right: 0;
    font-size: small;
    line-height: 1.5em;
  }

  .dashboard-bar {
    position: absolute;
    top: 32px;
    width: 100%;
    height: 16px;
  }

  .progress {
    position: absolute;
    bottom: 0;
    font-size: 14px;
    .completed {
      left: 0;
    }
    .help {
      right: 0;
    }
  }

</style>
