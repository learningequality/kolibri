<template>

  <LearnerProgressLabel
    :verb="verb"
    :icon="icon"
    :verbosity="verbosity"
    :style="style"
    :count="1"
  />

</template>


<script>

  import { STATUSES } from '../../../modules/classSummary/constants';
  import { VERBS, ICONS } from './constants';
  import LearnerProgressLabel from './LearnerProgressLabel';

  const VERB_MAP = {
    [STATUSES.notStarted]: VERBS.notStarted,
    [STATUSES.started]: VERBS.started,
    [STATUSES.helpNeeded]: VERBS.needHelp,
    [STATUSES.completed]: VERBS.completed,
  };

  const ICON_MAP = {
    [STATUSES.notStarted]: ICONS.nothing,
    [STATUSES.started]: ICONS.clock,
    [STATUSES.helpNeeded]: ICONS.help,
    [STATUSES.completed]: ICONS.star,
  };

  export default {
    name: 'StatusSimple',
    components: {
      LearnerProgressLabel,
    },
    props: {
      verbose: {
        type: Boolean,
        default: true,
      },
      status: {
        type: String,
        required: true,
      },
    },
    computed: {
      verb() {
        return VERB_MAP[this.status];
      },
      icon() {
        return ICON_MAP[this.status];
      },
      verbosity() {
        return this.verbose ? 1 : 0;
      },
      style() {
        if (this.status === STATUSES.notStarted) {
          return { color: this.$themeTokens.textDisabled };
        }
        return '';
      },
    },
  };

</script>


<style lang="scss" scoped>

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
