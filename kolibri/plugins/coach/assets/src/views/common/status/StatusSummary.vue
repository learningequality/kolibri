<template>

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
        v-if="helpNeeded"
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
        v-if="helpNeeded"
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

  export default {
    name: 'StatusSummary',
    components: {
      LearnerProgressCount,
      LearnerProgressRatio,
    },
    props: {
      // Every learner should be tallied into _one and only_ one status
      tallyObject: {
        type: Object,
        required: true,
        validator(value) {
          return (
            Number.isInteger(value.started) &&
            Number.isInteger(value.notStarted) &&
            Number.isInteger(value.completed) &&
            Number.isInteger(value.helpNeeded)
          );
        },
      },
      verbose: {
        type: Boolean,
        default: true,
      },
      ratio: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      started() {
        // To the user, all these are considered having 'started'
        return this.tallyObject.started + this.tallyObject.helpNeeded;
      },
      completed() {
        return this.tallyObject.completed;
      },
      helpNeeded() {
        return this.tallyObject.helpNeeded;
      },
      notStarted() {
        return this.tallyObject.notStarted;
      },
      total() {
        return this.started + this.tallyObject.completed + this.notStarted;
      },
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
