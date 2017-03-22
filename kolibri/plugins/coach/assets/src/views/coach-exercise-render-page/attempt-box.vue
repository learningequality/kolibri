<template>

  <div class="attempt-box" :class="[selected ? 'selected' : 'non-selected']">
    <mat-svg
      v-if="interaction.hinted"
      class="svg-item svg-hint"
      category="action"
      name="lightbulb_outline"
    />
    <mat-svg
      v-else-if="interaction.correct === 0"
      class="svg-item svg-wrong"
      category="navigation"
      name="cancel"
    />
    <mat-svg
      v-else
      class="svg-item svg-correct"
      category="action"
      name="check_circle"
    />
  </div>

</template>


<script>

  module.exports = {
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
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .attempt-box
    background-color: $core-bg-light
    border-radius: 10px
    height: 60px
    width: 60px
    padding: 10px

  .selected
    border: 2px solid $core-text-default

  .non-selected
    border: 2px solid $core-text-disabled

  .svg-item
    height: 38px
    width: auto
    border-bottom: 2px solid $core-text-default
    padding: 2px

  .svg-hint
    fill: grey

  .svg-wrong
    fill: red

  .svg-correct
    fill: green

</style>
