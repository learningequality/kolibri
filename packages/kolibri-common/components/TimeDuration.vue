<template>

  <KOptionalText :text="seconds !== null ? formattedTime : ''" />

</template>


<script>

  const MINUTE = 60;
  const HOUR = MINUTE * 60;
  const DAY = HOUR * 24;

  export default {
    name: 'TimeDuration',
    props: {
      seconds: {
        type: Number,
        default: null,
      },
    },
    computed: {
      formattedTime() {
        if (this.seconds < 2 * MINUTE) {
          return this.$tr('seconds', { value: Math.floor(this.seconds) });
        } else if (this.seconds < HOUR) {
          return this.$tr('minutes', { value: Math.floor(this.seconds / MINUTE) });
        } else if (this.seconds < DAY) {
          return this.$tr('hours', { value: Math.floor(this.seconds / HOUR) });
        } else {
          return this.$tr('days', { value: Math.floor(this.seconds / DAY) });
        }
      },
    },
    $trs: {
      seconds: {
        message: '{value, number, integer} {value, plural, one {second} other {seconds}}',
        context:
          'Indicates time spent by learner on a specific activity. Only translate second/seconds.',
      },
      minutes: {
        message: '{value, number, integer} {value, plural, one {minute} other {minutes}}',
        context:
          'Indicates time spent by learner on a specific activity. Only translate minute/minutes.',
      },
      hours: {
        message: '{value, number, integer} {value, plural, one {hour} other {hours}}',
        context:
          'Indicates time spent by learner on a specific activity. Only translate hour/hours.',
      },
      days: {
        message: '{value, number, integer} {value, plural, one {day} other {days}}',
        context: 'Indicates time spent by learner on a specific activity. Only translate day/days.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
