<template>

  <span v-if="seconds">{{ formattedTime }}</span>
  <span v-else :style="{color: this.$coreGrey300}">–</span>

</template>


<script>

  import { mapGetters } from 'vuex';

  const MINUTE = 60;
  const HOUR = MINUTE * 60;
  const DAY = HOUR * 24;

  export default {
    name: 'TimeDuration',
    components: {},
    props: {
      seconds: {
        type: Number,
        required: false,
      },
    },
    computed: {
      ...mapGetters(['$coreGrey300']),
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
      seconds: '{value, number, integer} {value, plural, one {second} other {seconds}}',
      minutes: '{value, number, integer} {value, plural, one {minute} other {minutes}}',
      hours: '{value, number, integer} {value, plural, one {hour} other {hours}}',
      days: '{value, number, integer} {value, plural, one {day} other {days}}',
    },
  };

</script>


<style lang="scss" scoped></style>
