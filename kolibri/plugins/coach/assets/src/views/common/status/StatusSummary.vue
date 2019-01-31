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
  <div :class="{ verbose }">
    <template v-if="total === completed">
      <!-- special cases when everyone has finished -->
      <component
        :is="ratio || verbose ? LearnerProgressRatio : LearnerProgressCount"
        class="item"
        :verb="VERBS.completed"
        :icon="ICONS.star"
        :total="total"
        :count="completed"
        :verbosity="verbosity"
      />
    </template>
    <template v-else-if="total === notStarted">
      <!-- special cases when no one has started -->
      <component
        :is="ratio ? LearnerProgressRatio : LearnerProgressCount"
        class="item lighten"
        :verb="VERBS.notStarted"
        :icon="ICONS.nothing"
        :total="total"
        :count="notStarted"
        :verbosity="verbosity"
      />
    </template>
    <template v-else-if="ratio">
      <!-- for ratios we only want to display the ratio on the first displayed item -->
      <component
        :is="!verbose ? LearnerProgressCount : LearnerProgressRatio"
        v-if="completed"
        class="item"
        :verb="VERBS.completed"
        :icon="ICONS.star"
        :total="total"
        :count="completed"
        :verbosity="verbosity"
      />
      <component
        :is="!verbose || completed ? LearnerProgressCount : LearnerProgressRatio"
        v-if="started"
        class="item"
        :verb="VERBS.started"
        :icon="ICONS.clock"
        :total="total"
        :count="started"
        :verbosity="verbosity"
      />
      <component
        :is="!verbose || started || completed ? LearnerProgressCount : LearnerProgressRatio"
        v-if="helpNeeded && showNeedsHelp"
        class="item"
        :verb="VERBS.needHelp"
        :icon="ICONS.help"
        :total="total"
        :count="helpNeeded"
        :verbosity="verbosity"
      />
      <LearnerProgressCount
        v-if="!verbose"
        class="item lighten"
        :verb="VERBS.notStarted"
        :icon="ICONS.nothing"
        :total="total"
        :count="notStarted"
        :verbosity="verbosity"
      />
    </template>
    <template v-else>
      <!-- for counts -->
      <LearnerProgressCount
        v-if="completed"
        class="item"
        :verb="VERBS.completed"
        :icon="ICONS.star"
        :total="total"
        :count="completed"
        :verbosity="verbosity"
      />
      <LearnerProgressCount
        v-if="started"
        class="item"
        :verb="VERBS.started"
        :icon="ICONS.clock"
        :total="total"
        :count="started"
        :verbosity="verbosity"
      />
      <LearnerProgressCount
        v-if="helpNeeded && showNeedsHelp"
        class="item"
        :verb="VERBS.needHelp"
        :icon="ICONS.help"
        :total="total"
        :count="helpNeeded"
        :verbosity="verbosity"
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
      LearnerProgressCount() {
        return LearnerProgressCount;
      },
      LearnerProgressRatio() {
        return LearnerProgressRatio;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .verbose .item {
    display: block;
  }

  .lighten {
    color: #b3b3b3;
  }

</style>
