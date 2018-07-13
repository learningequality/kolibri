<template>

  <div class="attempt-box" :class="{selected: selected}">
    <template v-if="isAnswer">
      <mat-svg
        v-if="interaction.correct"
        class="svg-item svg-correct"
        category="action"
        name="check_circle"
      />
      <mat-svg
        v-if="!interaction.correct"
        class="svg-item svg-wrong"
        category="navigation"
        name="cancel"
      />
    </template>
    <mat-svg
      v-else-if="isHint"
      class="svg-item svg-hint"
      category="action"
      name="lightbulb_outline"
    />
    <mat-svg
      v-else-if="isError"
      class="svg-item svg-error"
      category="alert"
      name="error_outline"
    />
  </div>

</template>


<script>

  export default {
    name: 'InteractionItem',
    props: {
      interaction: {
        type: Object,
        required: true,
      },
      selected: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      isAnswer() {
        return this.interaction.type === 'answer';
      },
      isHint() {
        return this.interaction.type === 'hint';
      },
      isError() {
        return this.interaction.type === 'error';
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .attempt-box {
    display: inline-block;
    float: left;
    width: 60px;
    height: 60px;
    padding: 10px;
    margin-right: 10px;
    cursor: pointer;
    border: 2px solid $core-text-disabled;
    border-radius: 10px;
  }

  .selected {
    border: 2px solid $core-text-default;
  }

  .svg-item {
    width: auto;
    height: 38px;
    padding: 2px;
    border-bottom: 2px solid $core-text-default;
  }

  .svg-hint,
  .svg-error {
    fill: $core-text-annotation;
  }

  .svg-wrong {
    fill: $core-status-wrong;
  }

  .svg-correct {
    fill: $core-status-correct;
  }

</style>
