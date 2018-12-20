<template>

  <span>
    <template v-if="count">
      <LabeledIcon
        v-if="verbosity === 0"
        :label="count"
      >
        <mat-svg category="alert" name="error" />
      </LabeledIcon>
      <LabeledIcon
        v-else-if="verbosity === 1"
        :label="$tr('short', {count: count})"
      >
        <mat-svg category="alert" name="error" />
      </LabeledIcon>
      <LabeledIcon
        v-else
        :label="$tr('long', {count: count})"
      >
        <mat-svg category="alert" name="error" />
      </LabeledIcon>
    </template>
  </span>

</template>


<script>

  import LabeledIcon from './LabeledIcon';

  export default {
    name: 'NeedHelp',
    components: {
      LabeledIcon,
    },
    props: {
      count: {
        type: Number,
        required: true,
      },
      verbosity: {
        type: Number,
        default: 0,
      },
    },
    $trs: {
      short: '{count, number, integer} {count, plural, one {needs} other {need}} help',
      long:
        '{count, number, integer} {count, plural, one {learner needs} other {learners need}} help',
    },
  };

</script>


<style lang="scss" scoped></style>
