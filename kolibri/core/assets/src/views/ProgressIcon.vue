<template>

  <span ref="progress-icon">
    <UiIcon
      v-if="isInProgress"
      :ariaLabel="$tr('inProgress')"
      class="inprogress"
    >
      <mat-svg name="schedule" category="action" />
    </UiIcon>
    <UiIcon
      v-else-if="isCompleted"
      :ariaLabel="$tr('completed')"
      class="completed"
    >
      <mat-svg name="star" category="toggle" />
    </UiIcon>
    <UiTooltip trigger="progress-icon">
      {{ isInProgress ? $tr('inProgress') : $tr('completed') }}
    </UiTooltip>
  </span>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import UiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'ProgressIcon',
    $trs: {
      inProgress: 'In progress',
      completed: 'Completed',
    },
    components: {
      UiIcon,
      UiTooltip,
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


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .inprogress,
  .completed {
    color: white;
    cursor: default;
    border-radius: 50%;
  }

  .inprogress {
    background-color: $core-status-progress;
  }

  .completed {
    background-color: $core-status-mastered;
  }

</style>
