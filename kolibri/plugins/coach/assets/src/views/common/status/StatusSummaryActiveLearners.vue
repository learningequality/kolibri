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
    <!-- special cases when total active is 0 -->
    <component
      :is="ratio || verbose ? ActiveLearnerRatio : ActiveLearnerCount"
      v-if="total === 0"
      class="item"
      :verb="VERBS.active"
      :icon="ICONS.nothing"
      :total="total"
      :count="active"
      :verbosity="verbosity"
      debug="no learners are active"
    />
    <!-- special case when no one is active -->
    <ActiveLearnerCount
      v-else-if="total === notActive && !showAll"
      class="item"
      :style="{ color: $coreGrey300 }"
      :verb="VERBS.notActive"
      :icon="ICONS.nothing"
      :total="total"
      :count="notActive"
      :verbosity="verbosity"
      debug="no one is active"
    />
    <template v-else-if="ratio">
      <component
        :is="!verbose || ActiveLearnerRatio"
        v-if="showItem(active)"
        class="item"
        :verb="VERBS.active"
        :icon="ICONS.clock"
        :total="total"
        :count="active"
        :verbosity="verbosity"
        showRatioInTooltip
        debug="ratio; has some active"
      />
      <ActiveLearnerCount
        v-if="showItem(!verbose)"
        class="item"
        :style="{ color: $coreGrey300 }"
        :verb="VERBS.notActive"
        :icon="ICONS.nothing"
        :total="total"
        :count="notActive"
        :verbosity="verbosity"
        showRatioInTooltip
        debug="ratio; not verbose"
      />
    </template>
    <template v-else>
      <ActiveLearnerCount
        v-if="showItem(active)"
        class="item"
        :verb="VERBS.active"
        :icon="ICONS.clock"
        :total="total"
        :count="active"
        :verbosity="verbosity"
        debug="count; has some active"
      />
    </template>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { VERBS, ICONS } from './constants';
  import ActiveLearnerCount from './ActiveLearnerCount';
  import ActiveLearnerRatio from './ActiveLearnerRatio';
  import activeLearnersTallyMixin from './activeLearnersTallyMixin';

  export default {
    name: 'StatusSummaryActiveLearners',
    components: {
      ActiveLearnerCount,
      // eslint-disable-next-line vue/no-unused-components
      ActiveLearnerRatio, // it is used, it's just referenced dynamically
    },
    mixins: [activeLearnersTallyMixin, themeMixin],
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
