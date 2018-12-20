<template>

  <span>
    <LabeledIcon
      v-if="verbosity === 0"
      :label="$tr('completedShort', {count: count, total: total })"
    >
      <mat-svg category="social" name="people" />
    </LabeledIcon>
    <LabeledIcon
      v-else
      :label="$tr('completed', {count: count, total: total })"
    >
      <mat-svg category="social" name="people" />
    </LabeledIcon>
  </span>

</template>


<script>

  import LabeledIcon from './LabeledIcon';

  export default {
    name: 'Completed',
    components: {
      LabeledIcon,
    },
    props: {
      count: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
      verbosity: {
        type: Number,
        default: 0,
      },
    },
    $trs: {
      completedShort: '{count, number, integer} of {total, number, integer}',
      completed: '{count, number, integer} of {total, number, integer} completed',
    },
  };

</script>


<style lang="scss" scoped></style>
