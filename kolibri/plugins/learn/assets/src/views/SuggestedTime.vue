<template>

  <div class="time-context">
    <span v-if="seconds > 0">
      {{ $tr('suggestedTimeLabel') }}
      <TimeDuration :seconds="seconds" :expand="true" />
    </span>
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
