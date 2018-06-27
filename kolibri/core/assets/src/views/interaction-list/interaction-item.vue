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
    name: 'interactionItem',
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .attempt-box
    border-radius: 10px
    height: 60px
    width: 60px
    padding: 10px
    float: left
    margin-right: 10px
    cursor: pointer
    display: inline-block
    border: 2px solid $core-text-disabled

  .selected
    border: 2px solid $core-text-default

  .svg-item
    height: 38px
    width: auto
    border-bottom: 2px solid $core-text-default
    padding: 2px

  .svg-hint, svg-error
    fill: $core-text-annotation

  .svg-wrong
    fill: $core-status-wrong

  .svg-correct
    fill: $core-status-correct

</style>
