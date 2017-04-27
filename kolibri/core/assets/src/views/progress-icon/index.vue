<template>

  <span>
    <ui-icon
      v-if="isInProgress"
      ariaLabel="$tr('inProgress')"
      icon="schedule"
      class="inprogress"
    />
    <ui-icon
      v-else-if="isCompleted"
      ariaLabel="$tr('completed')"
      icon="check"
      class="completed"
    />
  </span>

</template>


<script>

  module.exports = {
    $trNameSpace: 'progressIcon',
    $trs: {
      inProgress: 'In progress',
      completed: 'Completed',
    },
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

  .inprogress, .completed
    border-radius: 50%
    color: white

  .inprogress
    background-color: #2196f3

  .completed
    background-color: #4caf50

</style>
