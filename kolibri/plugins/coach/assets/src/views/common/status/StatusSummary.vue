<template>

  <!--
    This is the primary mechanism for displaying cumulative status information
    for many learners on one or more pieces of content.

    It's parameterized by a few key dimensions, and the behavior has been
    tuned for readability over consistency. This means that it has a few intentional
    and perhaps a few unintentional edge cases.

    See localhost:8000/coach/#/about/statuses for a parametric overview
    of the possible behaviors.
   -->
  <div :class="verbose ? 'multi-line' : 'single-line'">
    <!-- special cases when total is 0 -->
    <component
      :is="ratio || verbose ? LearnerProgressRatio : LearnerProgressCount"
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
      :is="ratio || verbose ? LearnerProgressRatio : LearnerProgressCount"
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
    <LearnerProgressCount
      v-else-if="total === notStarted && !showAll"
      class="item"
      :style="{ color: $themeTokens.textDisabled }"
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
        :is="!verbose ? LearnerProgressCount : LearnerProgressRatio"
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
        :is="!verbose || completed ? LearnerProgressCount : LearnerProgressRatio"
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
        :is="!verbose || started || completed ? LearnerProgressCount : LearnerProgressRatio"
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
      <LearnerProgressCount
        v-if="showItem(!verbose) || includeNotStarted"
        class="item"
        :style="{ color: $themeTokens.textDisabled }"
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
      <LearnerProgressCount
        v-if="showItem(completed)"
        class="item"
        :verb="VERBS.completed"
        :icon="ICONS.star"
        :total="total"
        :count="completed"
        :verbosity="verbosity"
        debug="count; has some completed"
      />
      <LearnerProgressCount
        v-if="showItem(started)"
        class="item"
        :verb="VERBS.started"
        :icon="ICONS.clock"
        :total="total"
        :count="started"
        :verbosity="verbosity"
        debug="count; has some started"
      />
      <LearnerProgressCount
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

  import { VERBS, ICONS } from './constants';
  import LearnerProgressCount from './LearnerProgressCount';
  import LearnerProgressRatio from './LearnerProgressRatio';
  import tallyMixin from './tallyMixin';

  export default {
    name: 'StatusSummary',
    components: {
      LearnerProgressCount,
      // eslint-disable-next-line vue/no-unused-components
      LearnerProgressRatio, // it is used, it's just referenced dynamically
    },
    mixins: [tallyMixin],
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
      includeNotStarted: {
        type: Boolean,
        default: false,
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
      LearnerProgressCount() {
        return LearnerProgressCount;
      },
      LearnerProgressRatio() {
        return LearnerProgressRatio;
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

</style>
