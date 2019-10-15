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
    name: 'StatusElapsedTime',
    props: {
      date: {
        type: Date,
        required: false,
        default: null,
      },
      // actionType determines which version of the $trs to use
      // Options are: 'created', 'closed' or 'null'
      actionType: {
        type: String,
        required: false,
        default: null,
        validator: function (value) {
          return ['created', 'closed', null].includes(value)
        }
      }
    },
    data: () => ({
      now: now(),
    }),
    computed: {
      formattedTime() {
        // No need to do anything if there is no date given.
        if (!this.date) {
          return '';
        }
        const timeDifference = this.now - this.date;
        // The following is a bit verbose - but our i18n profiling can better process
        // our translation usage when used explicitly rather than by dynamically
        // generating the string identifiers.

        // Seconds
        if (timeDifference < MINUTE) {
          const strParams = { seconds: this.toSeconds(timeDifference) }
          switch(this.actionType) {
            case 'created':
              return this.$tr('createdSecondsAgo', strParams);
            case 'closed':
              return this.$tr('closedSecondsAgo', strParams);
            default:
              return this.$tr('secondsAgo', strParams);
          }
        }
        // Minutes
        if (timeDifference < HOUR) {
          const strParams = { minutes: this.toMinutes(timeDifference) }
          switch(this.actionType) {
            case 'created':
              return this.$tr('createdMinutesAgo', strParams);
            case 'closed':
              return this.$tr('closedMinutesAgo', strParams);
            default:
              return this.$tr('minutesAgo', strParams);
          }
        }
        // Hours
        if (timeDifference < DAY) {
          const strParams = { hours: this.toHours(timeDifference) }
          switch(this.actionType) {
            case 'created':
              return this.$tr('createdHoursAgo', strParams);
            case 'closed':
              return this.$tr('closedHoursAgo', strParams);
            default:
              return this.$tr('hoursAgo', strParams);
          }
        }
        // else, Days
        const strParams = { days: this.toDays(timeDifference) }
        switch(this.actionType) {
          case 'created':
            return this.$tr('createdDaysAgo', strParams);
          case 'closed':
            return this.$tr('closedDaysAgo', strParams);
          default:
            return this.$tr('daysAgo', strParams);
        }
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
      closedSecondsAgo: {
        message: 'Closed {seconds} {seconds, plural, one {second} other {seconds}} ago',
        context:
          'Indicates that an item was closed a number of seconds prior to the current time, but is always less than 1 minute ago.',
      },
      closedMinutesAgo: {
        message: 'Closed {minutes} {minutes, plural, one {minute} other {minutes}} ago',
        context:
          'Indicates that an item was closed a number of minutes prior to the current time, but the time is always less than 1 hour ago.',
      },
      closedHoursAgo: {
        message: 'Closed {hours} {hours, plural, one {hour} other {hours}} ago',
        context:
          'Indicates that an item was closed a number of hours prior to the current time, but the time is always less than one day ago',
      },
      closedDaysAgo: {
        message: 'Closed {days} {days, plural, one {day} other {days}} ago',
        context: 'Indicates that an item was closed a number of days prior to the current date.',
      },
      secondsAgo: {
        message: '{seconds} {seconds, plural, one {second} other {seconds}} ago',
        context:
          'Indicates that something occured seconds prior to the current time.',
      },
      minutesAgo: {
        message: '{minutes} {minutes, plural, one {minute} other {minutes}} ago',
        context:
          'Indicates that something occured minutes prior to the current time.',
      },
      hoursAgo: {
        message: '{hours} {hours, plural, one {hour} other {hours}} ago',
        context:
          'Indicates that something occured hours prior to the current time.',
      },
      daysAgo: {
        message: '{days} {days, plural, one {day} other {days}} ago',
        context: 'Indicates that something occured days prior to the current time.',
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
