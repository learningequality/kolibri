<template>

  <div class="time-context">
    <div v-if="seconds > 0">
      {{ coreString('suggestedTimeToComplete') }}
      <TimeDuration :seconds="seconds" />
    </div>
    <div v-if="seconds > 0">
      <KLabeledIcon icon="schedule">
        <TimeDuration :seconds="seconds" />
      </KLabeledIcon>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import TimeDuration from 'kolibri-common/components/TimeDuration';

  export default {
    name: 'SuggestedTime',
    components: { TimeDuration },
    mixins: [commonCoreStrings],
    props: {
      /* Time in ms */
      seconds: {
        type: Number,
        default: 8100,
      },
    },
  };

</script>


<style lang="scss" scoped></style>
