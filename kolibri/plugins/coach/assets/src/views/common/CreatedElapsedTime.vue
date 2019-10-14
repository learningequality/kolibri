<template>

  <p class="time-context">
    {{ formattedTime }}
  </p>

</template>
<script>

  import { now } from 'kolibri.utils.serverClock';

  const MINUTE = 60000;
  const HOUR = MINUTE * 60;
  const DAY = HOUR * 24;

  export default {
    name: 'CreatedElapsedTime',
    props: {
      date: {
        type: Date,
        required: true,
      },
    },
    data: () => ({
      now: now(),
    }),
    computed: {
      formattedTime() {
        const timeDifference = this.now - this.date;
        // Seconds
        if (timeDifference < MINUTE) {
          return this.$tr('createdSecondsAgo', { seconds: this.toSeconds(timeDifference) });
        }
        // Minutes
        if (timeDifference < HOUR) {
          return this.$tr('createdMinutesAgo', { minutes: this.toMinutes(timeDifference) });
        }
        // Hours
        if (timeDifference < DAY) {
          return this.$tr('createdHoursAgo', { hours: this.toHours(timeDifference) });
        }
        // else, Days
        return this.$tr('createdDaysAgo', { days: this.toDays(timeDifference) });
      },
    },
    methods: {
      toSeconds(ms) {
        return Math.floor(ms / 1000);
      },
      toMinutes(ms) {
        return Math.floor(this.toSeconds(ms) / 60);
      },
      toHours(ms) {
        return Math.floor(this.toMinutes(ms) / 60);
      },
      toDays(ms) {
        return Math.floor(this.toHours(ms) / 24);
      },
    },
    $trs: {
      createdSecondsAgo: {
        message: 'Created {seconds} {seconds, plural, one {second} other {seconds}} ago',
        context:
          'Indicates that an item was created a number of seconds prior to the current time, but is always less than 1 minute ago.',
      },
      createdMinutesAgo: {
        message: 'Created {minutes} {minutes, plural, one {minute} other {minutes}} ago',
        context:
          'Indicates that an item was created a number of minutes prior to the current time, but the time is always less than 1 hour ago.',
      },
      createdHoursAgo: {
        message: 'Created {hours} {hours, plural, one {hour} other {hours}} ago',
        context:
          'Indicates that an item was created a number of hours prior to the current time, but the time is always less than one day ago',
      },
      createdDaysAgo: {
        message: 'Created {days} {days, plural, one {day} other {days}} ago',
        context: 'Indicates that an item was created a number of days prior to the current date.',
      },
    },
  };

</script>

<style scoped lang='scss'>

  .time-context {
    margin-top: 2px;
    margin-bottom: -1rem;
    font-size: small;
    color: gray;
  }

</style>
