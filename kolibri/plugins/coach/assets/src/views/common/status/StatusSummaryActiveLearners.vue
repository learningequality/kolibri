<template>

  <!--
    This is the primary mechanism for displaying cumulative status information
    for many learners on one or more pieces of content.

    It's parameterized by a few key dimensions, and the behavior has been
    tuned for readability over consistency. This means that it has a few intentional
    and perhaps a few unintentional edge cases.

    See locahost:8000/coach/#/about/learnerStatusTypes for a parametric overview
    of the possible behaviors.
   -->
  <div :class="verbose ? 'multi-line' : 'single-line'">
    <!-- special cases when total is 0 -->
    <component
      :is="ratio || verbose ? ActiveLearnerRatio : ActiveLearnerCount"
      v-if="total === 0"
      class="item"
      :verb="VERBS.started"
      :icon="ICONS.nothing"
      :total="total"
      :count="started"
      :verbosity="verbosity"
      debug="no learners"
    />
    <!-- special case when everyone has finished -->
    <component
      :is="ratio || verbose ? ActiveLearnerRatio : ActiveLearnerCount"
      v-else-if="total === completed && !showAll"
      class="item"
      :verb="VERBS.completed"
      :icon="ICONS.star"
      :total="total"
      :count="completed"
      :verbosity="verbosity"
      debug="everyone finished"
    />
    <!-- special case when no one has started -->
    <ActiveLearnerCount
      v-else-if="total === notStarted && !showAll"
      class="item"
      :style="{ color: $coreGrey300 }"
      :verb="VERBS.notStarted"
      :icon="ICONS.nothing"
      :total="total"
      :count="notStarted"
      :verbosity="verbosity"
      debug="no one started"
    />
    <template v-else-if="ratio">
      <!-- for ratios we only want to display the ratio on the first displayed item -->
      <component
        :is="!verbose ? ActiveLearnerCount : ActiveLearnerRatio"
        v-if="showItem(completed)"
        class="item"
        :verb="VERBS.completed"
        :icon="ICONS.star"
        :total="total"
        :count="completed"
        :verbosity="verbosity"
        showRatioInTooltip
        debug="ratio; has some completed"
      />
      <component
        :is="!verbose || completed ? ActiveLearnerCount : ActiveLearnerRatio"
        v-if="showItem(started)"
        class="item"
        :verb="VERBS.started"
        :icon="ICONS.clock"
        :total="total"
        :count="started"
        :verbosity="verbosity"
        showRatioInTooltip
        debug="ratio; has some started"
      />
      <component
        :is="!verbose || started || completed ? ActiveLearnerCount : ActiveLearnerRatio"
        v-if="showItem(helpNeeded) && showNeedsHelp"
        class="item"
        :verb="VERBS.needHelp"
        :icon="ICONS.help"
        :total="total"
        :count="helpNeeded"
        :verbosity="verbosity"
        showRatioInTooltip
        debug="ratio; has some needing help"
      />
      <ActiveLearnerCount
        v-if="showItem(!verbose)"
        class="item"
        :style="{ color: $coreGrey300 }"
        :verb="VERBS.notStarted"
        :icon="ICONS.nothing"
        :total="total"
        :count="notStarted"
        :verbosity="verbosity"
        showRatioInTooltip
        debug="ratio; not verbose"
      />
    </template>
    <template v-else>
      <!-- for counts -->
      <ActiveLearnerCount
        v-if="showItem(completed)"
        class="item"
        :verb="VERBS.completed"
        :icon="ICONS.star"
        :total="total"
        :count="completed"
        :verbosity="verbosity"
        debug="count; has some completed"
      />
      <ActiveLearnerCount
        v-if="showItem(started)"
        class="item"
        :verb="VERBS.started"
        :icon="ICONS.clock"
        :total="total"
        :count="started"
        :verbosity="verbosity"
        debug="count; has some started"
      />
      <ActiveLearnerCount
        v-if="showItem(helpNeeded) && showNeedsHelp"
        class="item"
        :verb="VERBS.needHelp"
        :icon="ICONS.help"
        :total="total"
        :count="helpNeeded"
        :verbosity="verbosity"
        debug="count; has some needing help"
      />
    </template>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { VERBS, ICONS } from './constants';
  import ActiveLearnerCount from './ActiveLearnerCount';
  import ActiveLearnerRatio from './ActiveLearnerRatio';
  import tallyMixin from './tallyMixin';

  export default {
    name: 'StatusSummaryActiveLearners',
    components: {
      ActiveLearnerCount,
      // eslint-disable-next-line vue/no-unused-components
      ActiveLearnerRatio, // it is used, it's just referenced dynamically
    },
    mixins: [tallyMixin, themeMixin],
    props: {
      verbose: {
        type: Boolean,
        default: true,
      },
      ratio: {
        type: Boolean,
        default: true,
      },
      singleLineShowZeros: {
        type: Boolean,
        default: true,
      },
      showNeedsHelp: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      verbosity() {
        return this.verbose ? 1 : 0;
      },
      ICONS() {
        return ICONS;
      },
      VERBS() {
        return VERBS;
      },
      ActiveLearnerCount() {
        return ActiveLearnerCount;
      },
      ActiveLearnerRatio() {
        return ActiveLearnerRatio;
      },
      showAll() {
        return this.singleLineShowZeros && !this.verbose;
      },
    },
    methods: {
      showItem(suggested) {
        return suggested || this.showAll;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .multi-line {
    line-height: 1.5em;
  }

  .multi-line .item {
    display: block;
  }

  .single-line {
    white-space: nowrap;
  }

  .single-line .item {
    display: inline-block;
    &:not(:last-child) {
      margin-right: 16px;
    }
  }

  .lighten {
    color: #b3b3b3;
  }

</style>
