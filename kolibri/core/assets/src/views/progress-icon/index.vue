<template>

  <span ref="progress-icon">
    <ui-icon
      v-if="isInProgress"
      :ariaLabel="$tr('inProgress')"
      icon="schedule"
      class="inprogress"
    />
    <ui-icon
      v-else-if="isCompleted"
      :ariaLabel="$tr('completed')"
      icon="check"
      class="completed"
    />
    <ui-tooltip trigger="progress-icon">
      {{ isInProgress ? $tr('inProgress') : $tr('completed') }}
    </ui-tooltip>
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
      'ui-tooltip': require('keen-ui/src/UiTooltip'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .inprogress, .completed
    border-radius: 50%
    color: white
    cursor: default


  .inprogress
    background-color: $core-status-progress

  .completed
    background-color: $core-status-correct

</style>
