<template>

  <div class="time-context">
    <div v-if="time > 0">
      {{ $tr('shortTime', { time: 120 }) }}
    </div>
    <div v-if="time > 0">
      {{ $tr('suggestedTimeLabel', { time: 120 }) }}
    </div>
    {{ $tr('suggestedTimeTooltip') }}
  </div>

</template>


<script>

  export default {
    name: 'SuggestedTime',
    props: {
      /* Time in ms */
      time: {
        type: Number,
        default: 0,
      },
    },
    $trs: {
      suggestedTimeTooltip: {
        message: 'Suggested time to complete',
        context:
          'A tooltip explaning what the clock icon and time indicates about the resource  they are viewing',
      },
      shortTime: {
        message: '{time} {time, plural, one {minute} other {minutes}}',
        context: 'Converts the time given into internationalized time. Nothing to translate here.',
      },
      suggestedTimeLabel: {
        message: 'Suggested time to complete: {time} {time, plural, one {minute} other {minutes}}',
        context:
          "Indicates to the user the suggested time the resource should take to complete. The '# minutes' string is internationalized automatically",
      },
    },
  };

</script>


<style scoped lang="scss"></style>
