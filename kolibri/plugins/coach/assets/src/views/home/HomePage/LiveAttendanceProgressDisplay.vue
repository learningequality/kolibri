<template>

  <router-link class="link" :style="{color: $coreTextDefault}" :to="to">
    <KGrid class="wrapper">
      <KGridItem size="75" percentage>
        <h3 class="title">{{ name }}</h3>
      </KGridItem>

      <KGridItem size="25" percentage alignment="right">
        <div class="context">
          <Recipients :groupNames="groupNames" />
        </div>
      </KGridItem>

      <KGridItem size="100" percentage>
        <ActiveLearnerSummaryBar
          :tally="tally"
          class="dashboard-bar"
        />
      </KGridItem>

      <KGridItem size="100" percentage>
        <StatusSummaryActiveLearners
          :tally="tally"
        />
      </KGridItem>
    </KGrid>
  </router-link>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import commonCoach from '../../common';
  import ActiveLearnerSummaryBar from '../../common/status/ActiveLearnerSummaryBar';

  export default {
    name: 'LiveAttendanceProgressDisplay',
    components: {
      ActiveLearnerSummaryBar,
    },
    mixins: [commonCoach, themeMixin],
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
      to: {
        type: Object,
        required: false,
        validators: validateLinkObject,
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

  .link {
    text-decoration: none;
  }

  .wrapper {
    margin-bottom: 8px;
  }

</style>
