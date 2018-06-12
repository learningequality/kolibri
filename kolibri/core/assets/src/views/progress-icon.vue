<template>

  <span ref="progress-icon">
    <ui-icon
      v-if="isInProgress"
      :ariaLabel="$tr('inProgress')"
      class="inprogress"
    >
      <mat-svg name="schedule" category="action" />
    </ui-icon>
    <ui-icon
      v-else-if="isCompleted"
      :ariaLabel="$tr('completed')"
      class="completed"
    >
      <mat-svg name="star" category="toggle" />
    </ui-icon>
    <ui-tooltip trigger="progress-icon">
      {{ isInProgress ? $tr('inProgress') : $tr('completed') }}
    </ui-tooltip>
  </span>

</template>


<script>

  import uiIcon from 'keen-ui/src/UiIcon';
  import uiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'progressIcon',
    $trs: {
      inProgress: 'In progress',
      completed: 'Completed',
    },
    components: {
      uiIcon,
      uiTooltip,
    },
    props: {
      progress: {
        type: Number,
        required: false,
        validator(value) {
          return value >= 0 && value <= 1;
        },
      },
    },
    computed: {
      isInProgress() {
        return this.progress !== null && this.progress >= 0 && this.progress < 1;
      },
      isCompleted() {
        return this.progress >= 1;
      },
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
    background-color: $core-status-mastered

</style>
