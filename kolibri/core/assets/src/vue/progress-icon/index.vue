<template>

  <div class="wrapper">
    <div v-if="isInProgress" class="progress-icon inprogress">
      <svg src="./progress-icons/inprogress.svg"/>
    </div>

    <div v-else-if="isCompleted" class="progress-icon completed">
      <svg src="./progress-icons/completed.svg"/>
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
        return this.progress === 1;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .wrapper
    display: inline-block

  .progress-icon
    border-radius: 50%
    text-align: center

  svg
    display: block
    fill: black

  .inprogress
    background-color: #ff9800

  .completed
    background-color: #4caf50

</style>
