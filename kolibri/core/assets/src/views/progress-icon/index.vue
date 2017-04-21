<template>

  <div class="wrapper">
    <div v-if="isInProgress" class="progress-icon inprogress">
      <ui-icon><mat-svg category="action" name="hourglass_empty"/></ui-icon>
    </div>

    <div v-else-if="isCompleted" class="progress-icon completed">
      <ui-icon><mat-svg category="navigation" name="check"/></ui-icon>
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      progress: {
        type: Number,
        required: false,
        validator(value) {
          return (value >= 0) && (value <= 1);
        },
      },
    },
    computed: {
      isInProgress() {
        return (this.progress > 0) && (this.progress < 1);
      },
      isCompleted() {
        return this.progress >= 1;
      },
    },
    components: {
      'ui-icon': require('keen-ui/src/UiIcon'),
    },
  };

</script>


<style lang="stylus" scoped>

  $icon-size = 1.2em

  .ui-icon
    font-size: $icon-size

  .wrapper
    display: inline-block

  .progress-icon
    border-radius: 50%
    line-height: $icon-size
    padding: 0.3em

  svg
    display: block
    fill: black

  .inprogress
    background-color: #828282

  .completed
    background-color: #E0B921

</style>
