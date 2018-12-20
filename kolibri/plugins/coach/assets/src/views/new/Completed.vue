<template>

  <span>
    <LabeledIcon
      v-if="verbosity === 0"
      :label="$tr('completedShort', {completed: completed, total: total })"
    >
      <mat-svg category="social" name="people" class="icon" />
    </LabeledIcon>
    <LabeledIcon
      v-else
      :label="$tr('completed', {completed: completed, total: total })"
    >
      <mat-svg category="social" name="people" class="icon" />
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
      completed: {
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
      completedShort: '{completed, number, integer} of {total, number, integer}',
      completed: '{completed, number, integer} of {total, number, integer} completed',
    },
  };

</script>


<style lang="scss" scoped></style>
