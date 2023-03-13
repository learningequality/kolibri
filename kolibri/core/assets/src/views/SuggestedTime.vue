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

  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

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


<style scoped lang="scss"></style>
