<template>

  <router-link class="link" :style="{color: $themeTokens.text}" :to="to">
    <KFixedGrid numCols="4" class="wrapper">
      <KFixedGridItem span="3">
        <h3 class="title">
          {{ name }}
        </h3>
      </KFixedGridItem>
      <KFixedGridItem span="1" alignment="right">
        <div class="context">
          <Recipients
            :groupNames="groupNames"
            :hasAssignments="hasAssignments"
          />
        </div>
      </KFixedGridItem>
      <KFixedGridItem>
        <ProgressSummaryBar :tally="tally" class="dashboard-bar" />
      </KFixedGridItem>
      <KFixedGridItem>
        <StatusSummary :tally="tally" />
      </KFixedGridItem>
    </KFixedGrid>
  </router-link>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
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
      hasAssignments: {
        type: Boolean,
        required: true,
      },
      tally: {
        type: Object,
        required: true,
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
    display: block;
    text-decoration: none;
  }

  .wrapper {
    margin-bottom: 8px;
  }

</style>
