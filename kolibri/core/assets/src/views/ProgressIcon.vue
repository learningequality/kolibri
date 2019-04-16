<template>

  <span>
    <span ref="icon">
      <UiIcon
        v-if="isInProgress"
        :ariaLabel="$tr('inProgress')"
        class="inprogress"
        :style="{ backgroundColor: $coreStatusProgress }"
      >
        <mat-svg name="schedule" category="action" />
      </UiIcon>
      <UiIcon
        v-else-if="isCompleted"
        :ariaLabel="$tr('completed')"
        class="completed"
        :style="{ backgroundColor: $coreStatusMastered }"
      >
        <mat-svg name="star" category="toggle" />
      </UiIcon>
    </span>
    <KTooltip
      reference="icon"
      :refs="$refs"
    >
      {{ isInProgress ? $tr('inProgress') + 
      ': ' + 
      Math.round(progress * 100) + 
      '%' : $tr('completed') }}
    </KTooltip>
  </span>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import UiIcon from 'keen-ui/src/UiIcon';
  import KTooltip from 'kolibri.coreVue.components.KTooltip';

  export default {
    name: 'ProgressIcon',
    $trs: {
      inProgress: 'In progress',
      completed: 'Completed',
    },
    components: {
      UiIcon,
      KTooltip,
    },
    mixins: [themeMixin],
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
        return this.progress !== null && this.progress > 0 && this.progress < 1;
      },
      isCompleted() {
        return this.progress >= 1;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .inprogress,
  .completed {
    color: white;
    cursor: default;
    border-radius: 50%;
  }

</style>
