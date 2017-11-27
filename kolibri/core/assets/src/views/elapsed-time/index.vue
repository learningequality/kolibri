<template>

  <span>
    <template v-if="date">{{ $tr($trUnit, {n: display}) }}</template>
    <template v-else>–</template>
  </span>

</template>


<script>

  import parse from 'date-fns/parse';
  import differenceInSeconds from 'date-fns/difference_in_seconds';
  import { now } from 'kolibri.utils.serverClock';

  const MINUTES_IN_DAY = 1440;
  const MINUTES_IN_WEEK = 10080;
  const MINUTES_IN_MONTH = 43200;
  const MINUTES_IN_YEAR = 525600;

  const UNITS = {
    SECONDS: 'seconds',
    MINUTES: 'minutes',
    HOURS: 'hours',
    DAYS: 'days',
    WEEKS: 'weeks',
    MONTHS: 'months',
    YEARS: 'years',
  };

  export default {
    name: 'elapsedTime',
    $trs: {
      secondsAgo: '{n, number, integer} {n, plural, one {second} other {seconds} } ago',
      minutesAgo: '{n, number, integer} {n, plural, one {minute} other {minutes} } ago',
      hoursAgo: '{n, number, integer} {n, plural, one {hour} other {hours} } ago',
      daysAgo: '{n, number, integer} {n, plural, one {day} other {days} } ago',
      weeksAgo: '{n, number, integer} {n, plural, one {week} other {weeks} } ago',
      monthsAgo: '{n, number, integer} {n, plural, one {month} other {months} } ago',
      yearsAgo: '{n, number, integer} {n, plural, one {year} other {years} } ago',
    },
    props: ['date'],
    data: () => ({
      now: now(),
      timer: null,
    }),
    computed: {
      $trUnit() {
        return `${this.unit}Ago`;
      },
      unit() {
        if (this.minutes < 1) {
          return UNITS.SECONDS;
        } else if (this.minutes < 60) {
          return UNITS.MINUTES;
        } else if (this.minutes < MINUTES_IN_DAY) {
          return UNITS.HOURS;
        } else if (this.minutes < MINUTES_IN_WEEK) {
          return UNITS.DAYS;
        } else if (this.minutes < MINUTES_IN_MONTH) {
          return UNITS.WEEKS;
        } else if (this.minutes < MINUTES_IN_YEAR) {
          return UNITS.MONTHS;
        }
        return UNITS.YEARS;
      },
      then() {
        return parse(this.date);
      },
      seconds() {
        return differenceInSeconds(this.now, this.then);
      },
      minutes() {
        const offset = this.now.getTimezoneOffset() - this.then.getTimezoneOffset();
        return Math.floor(this.seconds / 60) - offset;
      },
      display() {
        if (this.unit === UNITS.SECONDS) {
          return this.seconds;
        } else if (this.unit === UNITS.MINUTES) {
          return this.minutes;
        } else if (this.unit === UNITS.HOURS) {
          return Math.floor(this.minutes / 60);
        } else if (this.unit === UNITS.DAYS) {
          return Math.floor(this.minutes / MINUTES_IN_DAY);
        } else if (this.unit === UNITS.WEEKS) {
          return Math.floor(this.minutes / MINUTES_IN_WEEK);
        } else if (this.unit === UNITS.MONTHS) {
          return Math.floor(this.minutes / MINUTES_IN_MONTH);
        }
        return Math.floor(this.minutes / MINUTES_IN_YEAR);
      },
    },
    mounted() {
      this.timer = setInterval(() => {
        this.now = now();
      }, 10000);
    },
    beforeDestroy() {
      clearInterval(this.timer);
    },
  };

</script>


<style lang="stylus" scoped></style>
