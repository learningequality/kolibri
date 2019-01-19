<template>

  <span>
    <LabeledIcon :label="label">
      <mat-svg
        v-if="active"
        category="action"
        name="check_circle"
      />
      <mat-svg
        v-else
        category="content"
        name="remove_circle"
      />
    </LabeledIcon>
  </span>

</template>


<script>

  import LabeledIcon from './LabeledIcon';

  export default {
    name: 'QuizActive',
    components: {
      LabeledIcon,
    },
    props: {
      active: {
        type: Boolean,
        required: true,
      },
    },
    $trs: {
      active: 'Active',
      inactive: 'Inactive',
    },
    computed: {
      label() {
        return this.active ? this.$tr('active') : this.$tr('inactive');
      },
    },
  };

</script>


<style lang="scss" scoped></style>
