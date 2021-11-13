<template>

  <div class="time-context">
    <div v-if="seconds > 0">
      {{ $tr('suggestedTimeLabel') }}
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

  export default {
    name: 'SuggestedTime',
    components: { TimeDuration },
    props: {
      /* Time in ms */
      seconds: {
        type: Number,
        default: 8100,
      },
    },
    $trs: {
      suggestedTimeLabel: {
        message: 'Suggested time to complete',
        context:
          'A label preceding a number of minutes that the current resource is estimated to take to complete',
      },
    },
  };

</script>


<style scoped lang="scss"></style>
