<template>

  <KGrid>

    <KGridItem size="75" percentage>
      <h3 class="title">{{ name }}</h3>
    </KGridItem>

    <KGridItem size="25" percentage alignment="right">
      <div class="context">
        <Recipients :groupNames="groups" />
      </div>
    </KGridItem>

    <KGridItem size="100" percentage>
      <ProgressSummaryBar
        :tally="tally"
        class="dashboard-bar"
      />
    </KGridItem>

    <KGridItem size="75" percentage>
      <StatusSummary
        :tally="tally"
      />
    </KGridItem>

    <KGridItem size="25" percentage alignment="right">
      <HelpNeeded
        v-if="tally.helpNeeded"
        :count="tally.helpNeeded"
        :verbose="false"
        :ratio="false"
      />
    </KGridItem>

  </KGrid>

</template>


<script>

  import commonCoach from '../../common';
  import ProgressSummaryBar from '../../common/status/ProgressSummaryBar';

  export default {
    name: 'ItemProgressDisplay',
    components: {
      ProgressSummaryBar,
    },
    mixins: [commonCoach],
    props: {
      name: {
        type: String,
        required: true,
      },
      groupNames: {
        type: Array,
        required: true,
      },
      tally: {
        type: Object,
        required: true,
      },
      isLast: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    margin-bottom: 0;
  }

  .context {
    position: relative;
    top: 16px;
    margin-bottom: 16px;
    font-size: small;
  }

  .dashboard-bar {
    width: 100%;
    height: 16px;
    margin-top: 8px;
    margin-bottom: 8px;
  }

  .progress {
    position: absolute;
    bottom: 0;
    font-size: 14px;
  }

  .progress.completed {
    left: 0;
  }

  .progress.help {
    right: -12px;
  }

</style>
