<template>

  <span>{{ formattedTime }}</span>

</template>


<script>

  export default {
    name: 'TimeDuration',
    components: {},
    props: {
      seconds: {
        type: Number,
        required: true,
      },
    },
    computed: {
      formattedTime() {
        return this.$tr('minutes', { value: this.seconds / 60 });
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
