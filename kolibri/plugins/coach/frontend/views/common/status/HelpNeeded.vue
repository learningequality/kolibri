<template>

  <div>
    <component
      :is="ratio ? LearnerProgressRatio : LearnerProgressCount"
      :verb="VERBS.needHelp"
      :icon="ICONS.help"
      :total="total"
      :count="count"
      :verbosity="verbosity"
    />
  </div>

</template>


<script>

  import { VERBS, ICONS } from './constants';
  import LearnerProgressCount from './LearnerProgressCount';
  import LearnerProgressRatio from './LearnerProgressRatio';

  export default {
    name: 'HelpNeeded',
    components: {
      // eslint-disable-next-line vue/no-unused-components
      LearnerProgressCount, // it is used, it's just referenced dynamically
      // eslint-disable-next-line vue/no-unused-components
      LearnerProgressRatio, // it is used, it's just referenced dynamically
    },
    props: {
      count: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        default: 0,
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


<style lang="scss" scoped></style>
